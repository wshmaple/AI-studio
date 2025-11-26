import React from 'react';
import { IconPlus, IconMessageSquare, IconSparkles, IconX } from './Icons';
import { MOCK_HISTORY } from '../constants';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
        {/* Mobile Backdrop */}
        <div 
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />

        {/* Sidebar Container */}
        <div className={`
            fixed md:static inset-y-0 left-0 z-50
            w-64 bg-gray-950 border-r border-gray-850 flex flex-col h-full flex-shrink-0 
            transition-transform duration-300 transform md:transform-none
            ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-gray-850 h-16">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <IconSparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                    AI Studio
                    </span>
                </div>
                <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
                    <IconX className="w-5 h-5" />
                </button>
            </div>

            {/* New Prompt Button */}
            <div className="p-4">
                <button className="w-full flex items-center gap-2 bg-gray-850 hover:bg-gray-750 text-white p-3 rounded-full transition-colors border border-gray-750">
                <IconPlus className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium">Create new</span>
                </button>
            </div>

            {/* Library */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="px-4 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">My Library</h3>
                <div className="space-y-1">
                    {MOCK_HISTORY.map((item) => (
                    <button key={item.id} className="w-full flex items-start gap-3 p-2 hover:bg-gray-850 rounded-lg text-left group transition-colors">
                        <IconMessageSquare className="w-4 h-4 text-gray-500 mt-1 group-hover:text-blue-400" />
                        <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-300 truncate group-hover:text-white">{item.title}</div>
                        <div className="text-xs text-gray-600">{item.date}</div>
                        </div>
                    </button>
                    ))}
                </div>
                </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-850 text-xs text-gray-600">
                Google AI Studio Replica
            </div>
        </div>
    </>
  );
};

export default Sidebar;