import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import ProjectPanel from './components/ProjectPanel';
import AgentCanvas from './components/AgentCanvas';
import Markdown from './components/Markdown';
import { IconPlay, IconStop, IconImage, IconTrash, IconMenu, IconX, IconSettings, IconPlus, IconCode, IconNetwork, IconSparkles, IconZap, IconMic, IconMicOff, IconEdit, IconUpload } from './components/Icons';
import { ChatMessage, Role, ModelConfig, ProjectFile, GraphNode, GraphEdge } from './types';
import { DEFAULT_CONFIG } from './constants';
import { streamGeminiResponse } from './services/geminiService';
import { parseFilesFromResponse } from './utils/fileParser';

type ViewMode = 'chat' | 'project' | 'graph';

const STARTER_PROMPTS = [
    { title: "HTML/JS Prototype", prompt: "Create a simple interactive to-do list app using HTML, CSS, and Vanilla JavaScript in separate files." },
    { title: "React Component", prompt: "Write a React component for a responsive navigation bar with Tailwind CSS." },
    { title: "Explain Code", prompt: "I will paste some code. Please explain how it works step-by-step." },
    { title: "Python Script", prompt: "Write a Python script to analyze a CSV file and plot a graph using matplotlib." }
];

const DATA_KEY = 'gemini-app-data-v1';

export const App: React.FC = () => {
  // State
  const [config, setConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [inputImages, setInputImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Sidebar State
  const [systemInstructionsExpanded, setSystemInstructionsExpanded] = useState(false);
  
  // Right Panel State
  const [rightPanelMode, setRightPanelMode] = useState<ViewMode | null>(null);

  // Project Files State
  const [files, setFiles] = useState<ProjectFile[]>([]);
  
  // Graph State
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);

  // Drag & Drop State
  const [isDragging, setIsDragging] = useState(false);

  // Editing State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  
  // Smart Scroll Ref
  const shouldAutoScrollRef = useRef(true);

  // Load data from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(DATA_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.messages) setMessages(parsed.messages);
        if (parsed.files) setFiles(parsed.files);
        if (parsed.config) setConfig(parsed.config);
        if (parsed.nodes) setNodes(parsed.nodes);
        if (parsed.edges) setEdges(parsed.edges);
        // We don't restore `input` or `isGenerating` to avoid stale states
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
  }, []);

  // Save data to LocalStorage on change
  useEffect(() => {
    const dataToSave = {
      messages,
      files,
      config,
      nodes,
      edges
    };
    localStorage.setItem(DATA_KEY, JSON.stringify(dataToSave));
  }, [messages, files, config, nodes, edges]);

  // Handle Scroll to detect if user is at bottom
  const handleChatScroll = () => {
    if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        shouldAutoScrollRef.current = isAtBottom;
    }
  };

  // Smart Auto-scroll effect
  useEffect(() => {
    if (isGenerating && shouldAutoScrollRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (!isGenerating && editingMessageId === null) {
        // Force scroll on new message start (when not generating yet or just finished)
        // But mainly when user sends a message, we want to snap to bottom.
        // We handle that in handleRun usually by resetting shouldAutoScrollRef.
    }
  }, [messages, isGenerating, editingMessageId]);

  // Force scroll on new run
  useEffect(() => {
      if (isGenerating) {
         shouldAutoScrollRef.current = true;
         messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [isGenerating]);


  // Voice Input Setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        // Append to current input
        if (finalTranscript) {
             setInput(prev => {
                 const trailingSpace = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                 return prev + trailingSpace + finalTranscript;
             });
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
      if (isListening) {
          recognitionRef.current?.stop();
      } else {
          recognitionRef.current?.start();
      }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      // Only set false if leaving the main container
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
          processFiles(files);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = (files: File[]) => {
      files.forEach(file => {
        // Only process images for now for the chat input
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setInputImages(prev => [...prev, base64]);
            };
            reader.readAsDataURL(file);
        }
      });
  };

  const removeImage = (index: number) => {
    setInputImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpdate = (path: string, newContent: string) => {
      setFiles(prev => prev.map(f => f.path === path ? { ...f, content: newContent } : f));
  };

  const handleFileCreate = (path: string) => {
      if (!files.find(f => f.path === path)) {
          const ext = path.split('.').pop() || 'text';
          setFiles(prev => [...prev, { path, content: '', language: ext === 'ts' || ext === 'tsx' ? 'typescript' : ext }]);
      }
  };

  const handleFileDelete = (path: string) => {
      setFiles(prev => prev.filter(f => f.path !== path));
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  const clearHistory = () => {
    if(confirm("Are you sure you want to clear the chat history and project files?")) {
        setMessages([]);
        setFiles([]);
        setNodes([]);
        setEdges([]);
        localStorage.removeItem(DATA_KEY);
    }
  };

  // Run or Re-run logic
  const handleRun = async (overridePrompt?: string, slicedHistory?: ChatMessage[]) => {
    const promptText = overridePrompt || input;
    if ((!promptText.trim() && inputImages.length === 0) || isGenerating) return;

    // If slicedHistory provided, use it (Regeneration case)
    let currentHistory = slicedHistory || messages;

    // 1. Setup Chat Message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: Role.USER,
      text: promptText,
      images: inputImages,
    };
    
    // Add User Message
    currentHistory = [...currentHistory, userMessage];
    setMessages(currentHistory);
    
    setInput('');
    setInputImages([]);
    setIsGenerating(true);
    setEditingMessageId(null);
    shouldAutoScrollRef.current = true; // Reset scroll lock

    const modelMessageId = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      { id: modelMessageId, role: Role.MODEL, text: '', isLoading: true }
    ]);

    // 2. Setup Graph Nodes (Visualizing the Agent Workflow)
    const startY = nodes.length > 0 ? Math.max(...nodes.map(n => n.y)) + 300 : 100;
    
    const userNodeId = `user-${Date.now()}`;
    const modelNodeId = `model-${Date.now()}`;
    
    const newNodes: GraphNode[] = [
        {
            id: userNodeId,
            type: 'user',
            label: 'User Request',
            subLabel: 'Input',
            status: 'complete',
            x: 100,
            y: startY,
            data: { 
                preview: userMessage.text.substring(0, 50) + '...',
                fullContent: userMessage.text 
            }
        },
        {
            id: modelNodeId,
            type: 'model',
            label: 'Gemini Agent',
            subLabel: 'Reasoning & Orchestration',
            status: 'active',
            x: 500, // To the right of user
            y: startY,
            data: { 
                preview: 'Thinking...',
                fullContent: ''
            }
        }
    ];
    
    const newEdges: GraphEdge[] = [
        { id: `e-${userNodeId}-${modelNodeId}`, source: userNodeId, target: modelNodeId, animated: true }
    ];

    setNodes(prev => [...prev, ...newNodes]);
    setEdges(prev => [...prev, ...newEdges]);
    
    // Auto switch to graph if it's the first interaction
    if (!rightPanelMode && messages.length === 0) setRightPanelMode('graph');

    let toolNodeCreated = false;

    // Create AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Augment prompt for Thinking models to ensure they use xml tags if they don't natively
      let effectivePrompt = userMessage.text;
      if (config.modelName.includes('thinking')) {
          effectivePrompt += `\nPlease wrap your thought process in <think>...</think> tags before providing the final answer.`;
      }

      // CONTEXT INJECTION: Add current file states to prompt
      if (files.length > 0) {
          const fileContext = files.map(f => `<file path="${f.path}">\n${f.content}\n</file>`).join('\n\n');
          effectivePrompt += `\n\nCurrent Project Context (The user has these files open, consider their content when answering):\n${fileContext}`;
      }
      
      const historyForApi = currentHistory.slice(0, -1);

      await streamGeminiResponse(
        historyForApi, 
        effectivePrompt, 
        userMessage.images || [], 
        config,
        ({ text: chunkText, groundingMetadata, usageMetadata }) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === modelMessageId 
                ? { 
                    ...msg, 
                    text: chunkText, 
                    isLoading: false,
                    usage: usageMetadata ? {
                        promptTokens: usageMetadata.promptTokenCount,
                        responseTokens: usageMetadata.candidatesTokenCount,
                        totalTokens: usageMetadata.totalTokenCount
                    } : msg.usage
                  } 
                : msg
            )
          );

          setNodes(prev => prev.map(n => 
              n.id === modelNodeId ? { 
                  ...n, 
                  data: { 
                      preview: chunkText.substring(0, 80) + '...',
                      fullContent: chunkText
                  } 
              } : n
          ));

          if (groundingMetadata && !toolNodeCreated) {
              toolNodeCreated = true;
              const toolNodeId = `tool-${Date.now()}`;
              
              setNodes(prev => [
                  ...prev,
                  {
                      id: toolNodeId,
                      type: 'tool',
                      label: 'Google Search',
                      subLabel: 'Grounding',
                      status: 'complete',
                      x: 300,
                      y: startY + 150,
                      data: {
                          preview: `Found ${groundingMetadata.groundingChunks?.length || 0} sources`,
                          fullContent: JSON.stringify(groundingMetadata, null, 2)
                      }
                  }
              ]);

              setEdges(prev => [
                  ...prev,
                  { id: `e-${modelNodeId}-${toolNodeId}`, source: modelNodeId, target: toolNodeId, animated: false }
              ]);
          }

          const parsedFiles = parseFilesFromResponse(chunkText);
          if (parsedFiles.length > 0) {
              setFiles(prevFiles => {
                  const newMap = new Map(prevFiles.map(f => [f.path, f]));
                  parsedFiles.forEach(f => {
                      newMap.set(f.path, f);
                  });
                  return Array.from(newMap.values());
              });

              setNodes(currentNodes => {
                  const updatedNodes = [...currentNodes];
                  let fileYOffset = 0;

                  parsedFiles.forEach((file, idx) => {
                      const fileNodeId = `file-${modelNodeId}-${file.path}`;
                      const exists = updatedNodes.find(n => n.id === fileNodeId);
                      
                      if (!exists) {
                          updatedNodes.push({
                              id: fileNodeId,
                              type: 'file',
                              label: file.path.split('/').pop() || 'file',
                              subLabel: 'Artifact Generation',
                              status: 'complete',
                              x: 900,
                              y: startY + fileYOffset,
                              data: { 
                                  preview: file.language,
                                  fullContent: file.content
                              }
                          });
                          
                          setEdges(prevEdges => {
                              if (!prevEdges.find(e => e.target === fileNodeId)) {
                                  return [...prevEdges, { 
                                      id: `e-${modelNodeId}-${fileNodeId}`, 
                                      source: modelNodeId, 
                                      target: fileNodeId,
                                      animated: false 
                                  }];
                              }
                              return prevEdges;
                          });
                          
                          fileYOffset += 150;
                      } else {
                           updatedNodes.map(n => 
                               n.id === fileNodeId 
                               ? { ...n, data: { ...n.data, fullContent: file.content } } 
                               : n
                           );
                      }
                  });
                  return updatedNodes;
              });
              
              // If files are generated, maybe show project view
              if (parsedFiles.length > 0 && rightPanelMode !== 'project') {
                  // Optional: Auto switch to project view if desired
                  // setRightPanelMode('project');
              }
          }
        },
        abortController.signal
      );
      
      setNodes(prev => prev.map(n => n.id === modelNodeId ? { ...n, status: 'complete' } : n));
      setEdges(prev => prev.map(e => e.target === modelNodeId ? { ...e, animated: false } : e));

    } catch (error) {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: Role.MODEL, text: "Error generating response or stopped by user." }
      ]);
      setNodes(prev => prev.map(n => n.id === modelNodeId ? { ...n, status: 'error' } : n));
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const startEditing = (msg: ChatMessage) => {
      setEditingMessageId(msg.id);
      setEditText(msg.text);
  };

  const cancelEditing = () => {
      setEditingMessageId(null);
      setEditText('');
  };

  const saveAndRun = (msgId: string) => {
      // Find the index of the message being edited
      const index = messages.findIndex(m => m.id === msgId);
      if (index === -1) return;

      // Slice history up to this point (keep messages before this one)
      const slicedHistory = messages.slice(0, index);
      
      // Run with the new text
      handleRun(editText, slicedHistory);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRun();
    }
  };

  const toggleRightPanel = (mode: ViewMode) => {
      if (rightPanelMode === mode) {
          setRightPanelMode(null);
      } else {
          setRightPanelMode(mode);
      }
  }

  return (
    <div 
        className="flex h-screen bg-gray-950 text-gray-200 font-sans overflow-hidden relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
          <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-blue-500 border-dashed m-4 rounded-xl pointer-events-none">
              <div className="flex flex-col items-center animate-bounce">
                  <IconUpload className="w-12 h-12 text-blue-400 mb-2" />
                  <span className="text-xl font-semibold text-blue-200">Drop files to add context</span>
              </div>
          </div>
      )}

      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 bg-gray-900 relative">
        
        <div className="h-16 border-b border-gray-850 flex items-center justify-between px-4 bg-gray-950 flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden text-gray-400 hover:text-white"
             >
                <IconMenu className="w-6 h-6" />
             </button>
             <div className="flex flex-col">
                <input 
                  defaultValue="Untitled prompt" 
                  className="bg-transparent text-sm font-medium text-white focus:outline-none placeholder-gray-500 w-40"
                />
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
                onClick={clearHistory}
                className="text-gray-500 hover:text-red-400 text-xs px-2 hidden sm:block"
                title="Clear History"
            >
                Clear All
            </button>
            
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800 mr-2">
                <button 
                    onClick={() => toggleRightPanel('project')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${rightPanelMode === 'project' ? 'bg-gray-800 text-blue-400 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    title="Project Files"
                >
                    <IconCode className="w-4 h-4" />
                    <span className="hidden sm:inline">Project</span>
                </button>
                <div className="w-px bg-gray-800 my-1 mx-1"></div>
                <button 
                    onClick={() => toggleRightPanel('graph')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${rightPanelMode === 'graph' ? 'bg-gray-800 text-purple-400 shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    title="Agent Flow"
                >
                    <IconNetwork className="w-4 h-4" />
                    <span className="hidden sm:inline">Graph</span>
                </button>
            </div>

            <div className="w-px h-6 bg-gray-800 mx-2 hidden sm:block"></div>

            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2 rounded-md transition-colors ${isSettingsOpen ? 'bg-gray-800 text-blue-400' : 'text-gray-400 hover:text-white'}`}
            >
              <IconSettings className="w-5 h-5" />
            </button>
            
            {isGenerating ? (
               <button 
                onClick={handleStop}
                className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all bg-gray-800 hover:bg-gray-700 text-red-400 shadow-lg"
               >
                 <IconStop className="w-4 h-4 fill-current" />
                 <span>Stop</span>
               </button>
            ) : (
                <button 
                  onClick={() => handleRun()}
                  disabled={!input && inputImages.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all
                    ${(!input && inputImages.length === 0)
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                    }`}
                >
                  <IconPlay className="w-4 h-4 fill-current" />
                  <span>Run</span>
                </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${rightPanelMode ? 'hidden lg:flex lg:w-1/2' : 'w-full'}`}>
                <div 
                    ref={chatContainerRef}
                    onScroll={handleChatScroll}
                    className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
                >
                    <div className="max-w-3xl mx-auto w-full">
                        <div className={`bg-gray-950 rounded-lg border border-gray-800 overflow-hidden transition-all duration-300 ${systemInstructionsExpanded ? 'ring-1 ring-blue-900/50' : ''}`}>
                        <button 
                            onClick={() => setSystemInstructionsExpanded(!systemInstructionsExpanded)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-gray-950 hover:bg-gray-900/50 transition-colors"
                        >
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">System Instructions</span>
                            <span className="text-xs text-gray-600">{systemInstructionsExpanded ? 'Hide' : 'Show'}</span>
                        </button>
                        
                        {systemInstructionsExpanded && (
                            <div className="px-4 pb-4">
                            <textarea
                                value={config.systemInstruction}
                                onChange={(e) => setConfig({...config, systemInstruction: e.target.value})}
                                placeholder="Enter system instructions..."
                                className="w-full h-24 bg-gray-900 border border-gray-800 rounded-md p-3 text-sm text-gray-300 focus:outline-none focus:border-blue-500/50 resize-none placeholder-gray-600 font-mono"
                            />
                            </div>
                        )}
                        </div>
                    </div>

                    <div className="max-w-3xl mx-auto w-full space-y-6 pb-32">
                        {messages.length === 0 && (
                        <div className="py-10">
                            <div className="text-center mb-8">
                                <div className="inline-block p-4 rounded-full bg-gradient-to-br from-blue-900/20 to-purple-900/20 mb-4 border border-blue-900/30">
                                   <IconSparkles className="w-8 h-8 text-blue-400" />
                                </div>
                                <h2 className="text-2xl font-semibold text-gray-200 mb-2">Hello, how can I help today?</h2>
                                <p className="text-gray-500 text-sm">Create code, generate ideas, or ask complex questions.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                                {STARTER_PROMPTS.map((starter, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => handleRun(starter.prompt)}
                                        className="text-left p-4 rounded-xl bg-gray-800/50 border border-gray-800 hover:bg-gray-800 hover:border-blue-900/50 hover:shadow-lg transition-all group"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <IconZap className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
                                            <span className="font-medium text-gray-300 group-hover:text-blue-200 transition-colors">{starter.title}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 line-clamp-2">{starter.prompt}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        )}
                        
                        {messages.map((msg, index) => (
                        <div key={msg.id} className={`flex gap-4 group/msg ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === Role.MODEL && (
                            <div className="w-8 h-8 rounded flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mt-1">
                                <IconSparkles className="w-5 h-5 text-white" />
                            </div>
                            )}

                            <div className={`max-w-[85%] space-y-2 w-full`}>
                                {msg.images && msg.images.length > 0 && (
                                    <div className={`flex flex-wrap gap-2 mb-2 ${msg.role === Role.USER ? 'justify-end' : ''}`}>
                                    {msg.images.map((img, idx) => (
                                        <img key={idx} src={img} alt="attachment" className="h-48 rounded-lg border border-gray-700 object-cover" />
                                    ))}
                                    </div>
                                )}

                                {editingMessageId === msg.id ? (
                                    <div className="bg-gray-800 rounded-lg p-2 border border-blue-500/50 w-full">
                                        <textarea 
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="w-full bg-transparent text-gray-100 p-2 text-sm focus:outline-none resize-none font-sans"
                                            rows={3}
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button onClick={cancelEditing} className="px-3 py-1 text-xs text-gray-400 hover:text-white bg-gray-700 rounded-md">Cancel</button>
                                            <button onClick={() => saveAndRun(msg.id)} className="px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-md flex items-center gap-1">
                                                <IconPlay className="w-3 h-3" /> Save & Run
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative group">
                                        <div className={`
                                            p-4 rounded-2xl text-sm
                                            ${msg.role === Role.USER 
                                                ? 'bg-gray-800 text-gray-100 rounded-tr-sm' 
                                                : 'text-gray-300 pl-0'
                                            }
                                        `}>
                                            {msg.isLoading && !msg.text ? (
                                                <span className="animate-pulse">Thinking...</span>
                                            ) : (
                                                <Markdown content={msg.text} />
                                            )}

                                            {/* Token Usage Stats */}
                                            {msg.role === Role.MODEL && msg.usage && (
                                                <div className="mt-4 pt-3 border-t border-gray-800 text-[10px] text-gray-500 font-mono flex gap-3">
                                                    <span>Prompt: {msg.usage.promptTokens}</span>
                                                    <span>Response: {msg.usage.responseTokens}</span>
                                                    <span>Total: {msg.usage.totalTokens}</span>
                                                </div>
                                            )}
                                        </div>
                                        {msg.role === Role.USER && !isGenerating && (
                                            <button 
                                                onClick={() => startEditing(msg)}
                                                className="absolute -left-8 top-2 p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded-full opacity-0 group-hover/msg:opacity-100 transition-opacity"
                                                title="Edit prompt"
                                            >
                                                <IconEdit className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className="p-4 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent flex-shrink-0 z-10">
                    <div className="max-w-3xl mx-auto w-full bg-gray-950 rounded-xl border border-gray-700 shadow-2xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                        {inputImages.length > 0 && (
                        <div className="px-4 pt-4 flex gap-3 overflow-x-auto">
                            {inputImages.map((img, i) => (
                            <div key={i} className="relative group">
                                <img src={img} className="h-16 w-16 object-cover rounded-md border border-gray-700" />
                                <button 
                                onClick={() => removeImage(i)}
                                className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                <IconX className="w-3 h-3" />
                                </button>
                            </div>
                            ))}
                        </div>
                        )}

                        <div className="flex items-end gap-2 p-3">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-blue-400 hover:bg-gray-800 rounded-full transition-colors mb-1"
                            title="Add image"
                        >
                            <IconPlus className="w-5 h-5" />
                            <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            multiple 
                            className="hidden" 
                            onChange={handleImageUpload}
                            />
                        </button>
                        
                        <button 
                            onClick={toggleVoiceInput}
                            className={`p-2 rounded-full transition-colors mb-1 ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-blue-400 hover:bg-gray-800'}`}
                            title={isListening ? "Stop Listening" : "Start Voice Input"}
                        >
                            {isListening ? <IconMicOff className="w-5 h-5" /> : <IconMic className="w-5 h-5" />}
                        </button>
                        
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type something..."
                            className="flex-1 max-h-48 bg-transparent border-0 focus:ring-0 text-gray-200 placeholder-gray-600 resize-none py-3 text-base"
                            rows={1}
                            style={{ minHeight: '3rem' }}
                        />
                        </div>
                        
                        <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500">
                        <span>Enter to run, Shift+Enter for new line</span>
                        <span>{input.length} chars</span>
                        </div>
                    </div>
                </div>
            </div>

            {rightPanelMode === 'project' && (
                <div className="w-full md:w-[600px] lg:w-[800px] flex flex-col h-full border-l border-gray-850 bg-gray-950 shadow-2xl z-10 transition-all">
                    <ProjectPanel 
                        files={files} 
                        onFileUpdate={handleFileUpdate}
                        onFileCreate={handleFileCreate}
                        onFileDelete={handleFileDelete}
                        isOpen={true} 
                    />
                </div>
            )}
            
            {rightPanelMode === 'graph' && (
                <div className="w-full md:w-[600px] lg:w-[800px] flex flex-col h-full border-l border-gray-850 bg-gray-950 shadow-2xl z-10 transition-all">
                    <AgentCanvas 
                        nodes={nodes} 
                        edges={edges}
                        isOpen={true}
                    />
                </div>
            )}
        </div>

      <SettingsPanel 
        config={config} 
        onConfigChange={setConfig} 
        isOpen={isSettingsOpen} 
        toggleOpen={() => setIsSettingsOpen(!isSettingsOpen)} 
      />

    </div>
  );
};