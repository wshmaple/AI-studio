import React, { useRef, useState, useEffect } from 'react';
import { GraphNode, GraphEdge } from '../types';
import { IconSparkles, IconCode, IconMessageSquare, IconX, IconGlobe } from './Icons';

interface AgentCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  isOpen: boolean;
}

const GRID_SIZE = 20;

const NodeDetailsModal: React.FC<{ node: GraphNode; onClose: () => void }> = ({ node, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
                    <div className="flex items-center gap-3">
                         <div className={`
                             w-8 h-8 rounded-lg flex items-center justify-center
                             ${node.type === 'user' ? 'bg-gray-700 text-gray-300' :
                               node.type === 'model' ? 'bg-blue-600 text-white' :
                               node.type === 'file' ? 'bg-purple-600 text-white' : 
                               node.type === 'tool' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}
                        `}>
                            {node.type === 'user' && <IconMessageSquare className="w-4 h-4" />}
                            {node.type === 'model' && <IconSparkles className="w-4 h-4" />}
                            {node.type === 'file' && <IconCode className="w-4 h-4" />}
                            {node.type === 'tool' && <IconGlobe className="w-4 h-4" />}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-200">{node.label}</h3>
                            <p className="text-xs text-gray-500 uppercase">{node.subLabel}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full text-gray-500 hover:text-white transition-colors">
                        <IconX className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-[#1e1e1e]">
                    <pre className="p-6 text-sm font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                        {node.data?.fullContent || "No content available."}
                    </pre>
                </div>
                
                {/* Footer */}
                <div className="p-3 border-t border-gray-800 bg-gray-900 text-xs text-gray-500 flex justify-between shrink-0 rounded-b-xl">
                    <span>ID: {node.id}</span>
                    <span>Status: {node.status}</span>
                </div>
            </div>
        </div>
    );
};

const AgentCanvas: React.FC<AgentCanvasProps> = ({ nodes, edges, isOpen }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Center the view on initial load or when nodes change significantly
  useEffect(() => {
    if (nodes.length > 0 && view.x === 0 && view.y === 0) {
       // Simple center logic: Place the second node (usually the agent) in center
       const target = nodes[1] || nodes[0];
       if(containerRef.current && target) {
           const { width, height } = containerRef.current.getBoundingClientRect();
           setView({
               x: width / 2 - target.x,
               y: height / 2 - target.y,
               zoom: 1
           });
       }
    }
  }, [nodes.length, isOpen]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newZoom = Math.min(Math.max(view.zoom + scaleAmount, 0.2), 3);
    setView(prev => ({ ...prev, zoom: newZoom }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking on background
    if((e.target as HTMLElement).closest('.node-element')) return;
    
    setIsDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    setView(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  if (!isOpen) return null;

  return (
    <>
        <div 
        ref={containerRef}
        className="flex-1 bg-gray-950 overflow-hidden relative cursor-grab active:cursor-grabbing border-l border-gray-850"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        >
            {/* Background Grid */}
            <div 
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundSize: `${GRID_SIZE * view.zoom}px ${GRID_SIZE * view.zoom}px`,
                    backgroundPosition: `${view.x}px ${view.y}px`,
                    backgroundImage: `radial-gradient(circle, #4dabf7 1px, transparent 1px)`
                }}
            />

            {/* Canvas Content */}
            <div 
                className="absolute top-0 left-0 w-full h-full transform-origin-top-left will-change-transform"
                style={{
                    transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`
                }}
            >
                {/* Edges */}
                <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
                    <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#4b5563" />
                    </marker>
                    </defs>
                    {edges.map(edge => {
                        const source = nodes.find(n => n.id === edge.source);
                        const target = nodes.find(n => n.id === edge.target);
                        if (!source || !target) return null;

                        // Simple bezier curve
                        const startX = source.x + 150; // approximate center/right of node width
                        const startY = source.y + 40;
                        const endX = target.x;
                        const endY = target.y + 40;
                        
                        const controlPoint1X = startX + 50;
                        const controlPoint1Y = startY;
                        const controlPoint2X = endX - 50;
                        const controlPoint2Y = endY;

                        return (
                            <path 
                                key={edge.id}
                                d={`M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`}
                                stroke="#374151"
                                strokeWidth="2"
                                fill="none"
                                markerEnd="url(#arrowhead)"
                                className={edge.animated ? 'animate-pulse' : ''}
                            />
                        );
                    })}
                </svg>

                {/* Nodes */}
                {nodes.map(node => (
                    <div
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`
                            node-element absolute w-64 rounded-xl border p-4 shadow-xl transition-all duration-300 cursor-pointer
                            hover:scale-105 hover:shadow-2xl
                            ${node.status === 'active' ? 'ring-2 ring-blue-500 shadow-blue-900/20' : ''}
                            ${node.type === 'user' ? 'bg-gray-900 border-gray-700' : 
                            node.type === 'model' ? 'bg-gray-900 border-blue-900/50' :
                            node.type === 'file' ? 'bg-gray-900 border-purple-900/50' : 
                            node.type === 'tool' ? 'bg-gray-900 border-emerald-900/50' : 'bg-gray-900 border-gray-800'}
                        `}
                        style={{
                            transform: `translate(${node.x}px, ${node.y}px)`
                        }}
                    >
                        <div className="flex items-center gap-3 mb-2 pointer-events-none">
                            <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center
                                ${node.type === 'user' ? 'bg-gray-700 text-gray-300' :
                                node.type === 'model' ? 'bg-blue-600 text-white' :
                                node.type === 'file' ? 'bg-purple-600 text-white' : 
                                node.type === 'tool' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'}
                            `}>
                                {node.type === 'user' && <IconMessageSquare className="w-4 h-4" />}
                                {node.type === 'model' && <IconSparkles className="w-4 h-4" />}
                                {node.type === 'file' && <IconCode className="w-4 h-4" />}
                                {node.type === 'tool' && <IconGlobe className="w-4 h-4" />}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-gray-200">{node.label}</div>
                                {node.subLabel && <div className="text-[10px] text-gray-500 uppercase">{node.subLabel}</div>}
                            </div>
                            {node.status === 'active' && (
                                <div className="ml-auto">
                                    <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                </div>
                            )}
                        </div>

                        {node.data && node.data.preview && (
                            <div className="mt-2 text-xs text-gray-400 font-mono bg-black/20 p-2 rounded max-h-20 overflow-hidden text-ellipsis pointer-events-none">
                                {node.data.preview}
                            </div>
                        )}
                        
                        <div className="mt-2 pt-2 border-t border-white/5 flex justify-end">
                            <span className="text-[10px] text-gray-500 hover:text-blue-400 transition-colors">Click to view details</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Overlay Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                <button 
                    onClick={() => setView({ x: 0, y: 0, zoom: 1 })}
                    className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg shadow-lg border border-gray-700 transition-colors"
                    title="Reset View"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12"/></svg>
                </button>
            </div>
        </div>
        
        {/* Detail Modal */}
        {selectedNode && (
            <NodeDetailsModal node={selectedNode} onClose={() => setSelectedNodeId(null)} />
        )}
    </>
  );
};

export default AgentCanvas;