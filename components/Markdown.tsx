import React, { useState } from 'react';
import { IconCode, IconBrain, IconChevronDown, IconChevronRight, IconCopy, IconCheck } from './Icons';

// Declare Prism global
declare var Prism: any;

interface MarkdownProps {
  content: string;
}

/**
 * A lightweight markdown renderer that supports:
 * - Code blocks (```language ... ```)
 * - Inline code (`...`)
 * - Headers (# ...)
 * - Bold (**...**)
 * - Unordered lists (- ...)
 * - Thinking blocks (<think>...</think>)
 */
const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  if (!content) return null;

  // 1. Extract Thinking Blocks
  // Regex to match <think>content</think> across newlines
  const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = thinkRegex.exec(content)) !== null) {
    // Render text before thought
    if (match.index > lastIndex) {
      parts.push(
        <ContentParser key={`content-${lastIndex}`} content={content.substring(lastIndex, match.index)} />
      );
    }
    
    // Render thought block
    parts.push(
      <ThinkingBlock key={`think-${match.index}`} thought={match[1]} />
    );

    lastIndex = match.index + match[0].length;
  }

  // Render remaining text
  if (lastIndex < content.length) {
    parts.push(
       <ContentParser key={`content-${lastIndex}`} content={content.substring(lastIndex)} />
    );
  }

  return <div className="markdown-body space-y-3">{parts}</div>;
};

// Component to handle standard markdown parsing (code blocks, text)
const ContentParser: React.FC<{ content: string }> = ({ content }) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            parts.push(
                <TextSegment key={`text-${lastIndex}`} text={content.substring(lastIndex, match.index)} />
            );
        }
        const language = match[1] || 'text';
        const code = match[2];
        parts.push(
            <CodeBlock key={`code-${match.index}`} language={language} code={code} />
        );
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
        parts.push(
            <TextSegment key={`text-${lastIndex}`} text={content.substring(lastIndex)} />
        );
    }

    return <>{parts}</>;
}

// Collapsible Thinking Block
const ThinkingBlock: React.FC<{ thought: string }> = ({ thought }) => {
    const [isExpanded, setIsExpanded] = useState(true); // Default open to show action
    
    return (
        <div className="my-4 rounded-lg border border-gray-700 bg-gray-900/50 overflow-hidden">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-800 transition-colors text-xs text-gray-400 font-medium"
            >
                <IconBrain className="w-4 h-4 text-purple-400" />
                <span>Thinking Process</span>
                <span className="ml-auto">
                    {isExpanded ? <IconChevronDown className="w-3 h-3"/> : <IconChevronRight className="w-3 h-3"/>}
                </span>
            </button>
            
            {isExpanded && (
                <div className="p-3 text-sm text-gray-500 font-mono leading-relaxed whitespace-pre-wrap border-t border-gray-800 bg-black/20 italic">
                    {thought.trim()}
                </div>
            )}
        </div>
    );
}

// Sub-component to render styled code blocks
const CodeBlock = ({ language, code }: { language: string; code: string }) => {
  const [html, setHtml] = React.useState(code);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (typeof Prism !== 'undefined' && Prism.languages[language]) {
      setHtml(Prism.highlight(code, Prism.languages[language], language));
    } else {
       setHtml(code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    }
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-md overflow-hidden border border-gray-700 bg-[#1e1e1e] my-4 shadow-sm group">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 text-xs text-gray-400">
         <div className="flex items-center gap-2">
            <IconCode className="w-3 h-3" />
            <span>{language}</span>
         </div>
         <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            title="Copy code"
         >
             {copied ? (
                 <>
                    <IconCheck className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400">Copied</span>
                 </>
             ) : (
                 <>
                    <IconCopy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                 </>
             )}
         </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
        <code 
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: html }} 
        />
      </pre>
    </div>
  );
};

// Sub-component to render non-code block text (headers, bold, lists)
const TextSegment = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-lg font-semibold text-gray-100 mt-4 mb-2">{parseInline(line.substring(4))}</h3>);
    } 
    else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-xl font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-1">{parseInline(line.substring(3))}</h2>);
    }
    else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl font-bold text-white mt-6 mb-4">{parseInline(line.substring(2))}</h1>);
    }
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-gray-300 pl-1 mb-1">
          {parseInline(line.trim().substring(2))}
        </li>
      );
    }
    else if (/^\d+\.\s/.test(line.trim())) {
         const content = line.trim().replace(/^\d+\.\s/, '');
         elements.push(
            <div key={i} className="ml-4 flex gap-2 mb-1 text-gray-300">
                <span className="font-mono text-gray-500">{line.trim().match(/^\d+\./)?.[0]}</span>
                <span>{parseInline(content)}</span>
            </div>
         );
    }
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    else {
      elements.push(<p key={i} className="text-gray-300 leading-relaxed mb-1">{parseInline(line)}</p>);
    }
  }

  return <>{elements}</>;
};

const parseInline = (text: string): React.ReactNode[] => {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="bg-gray-800 text-gray-200 px-1 py-0.5 rounded text-xs font-mono border border-gray-700">{part.slice(1, -1)}</code>;
    }
    
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return (
      <React.Fragment key={index}>
        {boldParts.map((subPart, subIndex) => {
           if (subPart.startsWith('**') && subPart.endsWith('**')) {
             return <strong key={subIndex} className="font-semibold text-gray-100">{subPart.slice(2, -2)}</strong>;
           }
           return subPart;
        })}
      </React.Fragment>
    );
  });
};

export default Markdown;