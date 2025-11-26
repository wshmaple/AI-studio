import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ProjectFile, FileNode } from '../types';
import { IconChevronDown, IconFolder, IconFileText, IconDownload, IconPlus, IconTrash, IconEye, IconCode, IconArchive } from './Icons';
import JSZip from 'jszip';

// Declare Prism global
declare var Prism: any;

// Helper to map app languages to Prism languages
const getPrismLang = (lang: string) => {
  const map: Record<string, string> = {
    'javascript': 'javascript',
    'typescript': 'typescript',
    'html': 'markup',
    'css': 'css',
    'json': 'json',
    'python': 'python',
    'text': 'markdown'
  };
  return map[lang] || 'markdown';
};

const buildFileTree = (files: ProjectFile[]): FileNode[] => {
  const root: FileNode[] = [];

  files.forEach(file => {
    const parts = file.path.split('/').filter(p => p); 
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;
      let existingNode = currentLevel.find(n => n.name === part);

      if (!existingNode) {
        const newNode: FileNode = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
          content: isFile ? file.content : undefined
        };
        currentLevel.push(newNode);
        existingNode = newNode;
      }

      if (!isFile && existingNode.children) {
        currentLevel = existingNode.children;
      }
    });
  });
  
  const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'directory' ? -1 : 1;
      });
      nodes.forEach(n => {
          if (n.children) sortNodes(n.children);
      });
  };
  sortNodes(root);

  return root;
};

interface ProjectPanelProps {
  files: ProjectFile[];
  onFileUpdate: (path: string, newContent: string) => void;
  onFileCreate: (path: string) => void;
  onFileDelete: (path: string) => void;
  isOpen: boolean;
}

const FileTreeItem: React.FC<{ 
    node: FileNode; 
    depth: number; 
    activePath: string | null; 
    onSelect: (path: string) => void 
}> = ({ node, depth, activePath, onSelect }) => {
    const [expanded, setExpanded] = useState(true);
    const isDirectory = node.type === 'directory';
    const isActive = node.path === activePath && !isDirectory;

    return (
        <div>
            <div 
                className={`
                    flex items-center py-1.5 px-2 cursor-pointer select-none text-sm transition-colors
                    ${isActive ? 'bg-blue-900/30 text-blue-300' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}
                `}
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
                onClick={() => {
                    if (isDirectory) setExpanded(!expanded);
                    else onSelect(node.path);
                }}
            >
                <span className="w-4 h-4 flex items-center justify-center mr-1 shrink-0">
                    {isDirectory && (
                        <IconChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} />
                    )}
                </span>
                <span className={`mr-2 shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-500'}`}>
                    {isDirectory ? <IconFolder className="w-4 h-4" /> : <IconFileText className="w-4 h-4" />}
                </span>
                <span className="truncate leading-none">{node.name}</span>
            </div>
            {isDirectory && expanded && node.children && (
                <div>
                    {node.children.map(child => (
                        <FileTreeItem 
                            key={child.path} 
                            node={child} 
                            depth={depth + 1} 
                            activePath={activePath} 
                            onSelect={onSelect} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const CodeEditor: React.FC<{ 
    content: string; 
    language: string; 
    onChange: (val: string) => void 
}> = ({ content, language, onChange }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const lineNumbersRef = useRef<HTMLDivElement>(null);
    const [highlightedHtml, setHighlightedHtml] = useState('');

    useEffect(() => {
        if (typeof Prism !== 'undefined') {
            const prismLang = getPrismLang(language);
            const grammar = Prism.languages[prismLang] || Prism.languages.markdown;
            const html = Prism.highlight(content || '', grammar, prismLang);
            setHighlightedHtml(html + (content.endsWith('\n') ? '<br>' : ''));
        } else {
            setHighlightedHtml(content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
        }
    }, [content, language]);

    const handleScroll = () => {
        if (textareaRef.current && preRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
        if (textareaRef.current && lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    const lineCount = content.split('\n').length;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
        <div className="relative w-full h-full bg-[#2d2d2d] flex">
            <div 
                ref={lineNumbersRef}
                className="w-10 bg-[#252526] text-gray-600 text-right pr-2 pt-6 select-none overflow-hidden flex-shrink-0 editor-font border-r border-gray-800"
            >
                {lineNumbers.map(n => (
                    <div key={n}>{n}</div>
                ))}
            </div>
            <div className="relative flex-1 h-full overflow-hidden">
                <pre 
                    ref={preRef}
                    className="absolute inset-0 m-0 p-6 pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
                    aria-hidden="true"
                >
                    <code 
                        className={`editor-font language-${getPrismLang(language)}`}
                        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                    />
                </pre>
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={handleScroll}
                    className="absolute inset-0 w-full h-full p-6 bg-transparent text-transparent caret-white resize-none border-0 outline-none editor-font whitespace-pre-wrap break-words z-10 selection:bg-blue-500/30"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                />
            </div>
        </div>
    );
};

// Simple HTML Preview Component using Blob URL
const PreviewFrame: React.FC<{ files: ProjectFile[]; activePath: string }> = ({ files, activePath }) => {
    const [src, setSrc] = useState<string>('');

    useEffect(() => {
        const activeFile = files.find(f => f.path === activePath);
        if (!activeFile || activeFile.language !== 'html') return;

        let htmlContent = activeFile.content;

        // Replace relative CSS links with style tags containing actual content
        // Simple regex replace for <link rel="stylesheet" href="...">
        htmlContent = htmlContent.replace(/<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/g, (match, href) => {
            const cssFile = files.find(f => f.path.endsWith(href.replace(/^\.\//, '')));
            if (cssFile) {
                return `<style>${cssFile.content}</style>`;
            }
            return match;
        });

        // Replace script src with inline scripts
        htmlContent = htmlContent.replace(/<script\s+src=["']([^"']+)["']\s*><\/script>/g, (match, src) => {
             const jsFile = files.find(f => f.path.endsWith(src.replace(/^\.\//, '')));
             if (jsFile) {
                 return `<script>${jsFile.content}</script>`;
             }
             return match;
        });

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setSrc(url);

        return () => URL.revokeObjectURL(url);
    }, [files, activePath]);

    return (
        <div className="w-full h-full bg-white flex flex-col">
            <div className="bg-gray-100 p-2 border-b border-gray-300 text-xs text-gray-600 flex justify-between">
                <span>Preview Mode</span>
                <span className="truncate max-w-[200px]">{activePath}</span>
            </div>
            <iframe 
                src={src} 
                className="w-full h-full border-none"
                title="Preview"
                sandbox="allow-scripts"
            />
        </div>
    );
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({ files, onFileUpdate, onFileCreate, onFileDelete, isOpen }) => {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [mode, setMode] = useState<'code' | 'preview'>('code');

  const fileTree = useMemo(() => buildFileTree(files), [files]);
  
  useEffect(() => {
      if (!activePath && files.length > 0) {
          const readme = files.find(f => f.path.toLowerCase().includes('readme'));
          const index = files.find(f => f.path.toLowerCase().includes('index') || f.path.toLowerCase().includes('app'));
          const initial = readme?.path || index?.path || files[0].path;
          setActivePath(initial);
      }
  }, [files, activePath]);

  const activeFile = files.find(f => f.path === activePath);
  const isHtml = activeFile?.language === 'html';

  useEffect(() => {
      if (!isHtml && mode === 'preview') {
          setMode('code');
      }
  }, [activeFile, isHtml, mode]);

  const handleDownload = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.path.split('/').pop() || 'download.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportZip = async () => {
      if (files.length === 0) return;
      
      const zip = new JSZip();
      files.forEach(file => {
          zip.file(file.path, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'project-export.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const submitNewFile = () => {
      if(newFileName.trim()) {
          onFileCreate(newFileName.trim());
          setActivePath(newFileName.trim());
          setNewFileName('');
          setIsCreating(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-gray-950 border-l border-gray-850 w-full md:w-[600px] lg:w-[800px] shadow-2xl transition-all">
      <div className="flex h-12 border-b border-gray-850 items-center px-4 justify-between bg-gray-950 shrink-0">
          <span className="font-medium text-sm text-gray-300">Project Workspace</span>
          <div className="flex items-center gap-2">
             <button onClick={handleExportZip} className="p-1 hover:text-white text-gray-400" title="Export Project (ZIP)"><IconArchive className="w-4 h-4"/></button>
             <button onClick={() => setIsCreating(true)} className="p-1 hover:text-white text-gray-400" title="New File"><IconPlus className="w-4 h-4"/></button>
             <div className="text-xs text-gray-500">{files.length} files</div>
          </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r border-gray-850 flex flex-col bg-gray-900/30">
              <div className="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Explorer</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {isCreating && (
                      <div className="px-2 py-1">
                          <input 
                            autoFocus
                            type="text"
                            placeholder="filename.ts"
                            className="w-full bg-gray-800 text-white text-sm px-2 py-1 rounded border border-blue-500 focus:outline-none"
                            value={newFileName}
                            onChange={e => setNewFileName(e.target.value)}
                            onKeyDown={e => {
                                if(e.key === 'Enter') submitNewFile();
                                if(e.key === 'Escape') setIsCreating(false);
                            }}
                            onBlur={() => setIsCreating(false)}
                          />
                      </div>
                  )}
                  {files.length === 0 && !isCreating ? (
                      <div className="p-4 text-center text-gray-600 text-xs">
                          No files.
                      </div>
                  ) : (
                      <div className="py-2">
                        {fileTree.map(node => (
                            <FileTreeItem 
                                key={node.path} 
                                node={node} 
                                depth={0} 
                                activePath={activePath} 
                                onSelect={setActivePath} 
                            />
                        ))}
                      </div>
                  )}
              </div>
          </div>

          <div className="flex-1 flex flex-col bg-gray-950 min-w-0">
              {activeFile ? (
                  <>
                      <div className="flex items-center h-10 bg-gray-900 border-b border-gray-850 overflow-x-auto shrink-0 justify-between">
                           <div className="flex items-center h-full">
                               <div className="px-4 h-full flex items-center text-xs text-blue-300 bg-gray-800 border-t-2 border-blue-500 border-r border-gray-700 min-w-[120px] max-w-[200px] group relative mr-4">
                                   <IconFileText className="w-3.5 h-3.5 mr-2 text-blue-400" />
                                   <span className="truncate">{activeFile.path.split('/').pop()}</span>
                               </div>
                               
                               {/* Toggle View Mode */}
                               {isHtml && (
                                   <div className="flex bg-gray-800 rounded p-0.5 border border-gray-700">
                                       <button 
                                           onClick={() => setMode('code')}
                                           className={`px-3 py-0.5 rounded text-[10px] font-medium transition-colors ${mode === 'code' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                       >
                                           <div className="flex items-center gap-1">
                                               <IconCode className="w-3 h-3"/> Code
                                           </div>
                                       </button>
                                       <button 
                                           onClick={() => setMode('preview')}
                                           className={`px-3 py-0.5 rounded text-[10px] font-medium transition-colors ${mode === 'preview' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                       >
                                           <div className="flex items-center gap-1">
                                               <IconEye className="w-3 h-3"/> Preview
                                           </div>
                                       </button>
                                   </div>
                               )}
                           </div>
                           
                           <div className="flex items-center pr-3 gap-3">
                                <div className="text-[10px] text-gray-500 font-mono">
                                    {activeFile.language.toUpperCase()}
                                </div>
                                <button 
                                    onClick={handleDownload}
                                    className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                                    title="Download File"
                                >
                                    <IconDownload className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => {
                                        onFileDelete(activeFile.path);
                                        setActivePath(null);
                                    }}
                                    className="p-1 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400 transition-colors"
                                    title="Delete File"
                                >
                                    <IconTrash className="w-4 h-4" />
                                </button>
                           </div>
                      </div>
                      <div className="flex-1 relative group bg-[#2d2d2d]">
                          {mode === 'code' ? (
                            <CodeEditor 
                                content={activeFile.content}
                                language={activeFile.language}
                                onChange={(val) => onFileUpdate(activeFile.path, val)}
                            />
                          ) : (
                             <PreviewFrame files={files} activePath={activeFile.path} />
                          )}
                      </div>
                  </>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center">
                          <IconFolder className="w-8 h-8 text-gray-700" />
                      </div>
                      <p className="text-sm">Select a file from the explorer to view code</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default ProjectPanel;