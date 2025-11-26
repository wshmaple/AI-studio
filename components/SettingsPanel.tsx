import React from 'react';
import { ModelConfig } from '../types';
import { AVAILABLE_MODELS } from '../constants';
import { IconSettings, IconChevronDown } from './Icons';

interface SettingsPanelProps {
  config: ModelConfig;
  onConfigChange: (newConfig: ModelConfig) => void;
  isOpen: boolean;
  toggleOpen: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onConfigChange, isOpen, toggleOpen }) => {
  if (!isOpen) return null;

  const handleChange = (key: keyof ModelConfig, value: any) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <div className="w-80 bg-gray-950 border-l border-gray-850 flex flex-col h-full flex-shrink-0 overflow-y-auto">
      <div className="p-4 border-b border-gray-850 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
           <IconSettings className="w-5 h-5 text-gray-400" />
           <span className="font-medium text-gray-200">Run settings</span>
        </div>
      </div>

      <div className="p-5 space-y-8">
        
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Model</label>
          <div className="relative">
            <select 
              value={config.modelName}
              onChange={(e) => handleChange('modelName', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-md p-2.5 appearance-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <IconChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Tools Section */}
        <div className="space-y-4">
            <label className="text-xs font-semibold text-gray-500 uppercase">Tools</label>
            <div className="flex items-center justify-between p-2 bg-gray-900 rounded-lg border border-gray-800">
                <span className="text-sm text-gray-300">Google Search</span>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={config.enableGoogleSearch}
                        onChange={(e) => handleChange('enableGoogleSearch', e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>
        </div>

        {/* Temperature */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <label className="text-xs font-semibold text-gray-500 uppercase">Temperature</label>
             <input 
                type="number" 
                value={config.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                className="w-16 bg-gray-900 border border-gray-700 text-right text-xs rounded p-1 text-gray-300"
                step="0.1"
                min="0"
                max="2"
             />
          </div>
          <input 
            type="range" 
            min="0" 
            max="2" 
            step="0.1" 
            value={config.temperature}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-600">
             <span>Reserved</span>
             <span>Creative</span>
          </div>
        </div>

        {/* Output Length */}
        <div className="space-y-4">
           <div className="flex justify-between items-center">
             <label className="text-xs font-semibold text-gray-500 uppercase">Output Length</label>
             <span className="text-xs text-gray-400">{config.maxOutputTokens} tokens</span>
          </div>
           <input 
            type="range" 
            min="100" 
            max="8192" 
            step="100" 
            value={config.maxOutputTokens}
            onChange={(e) => handleChange('maxOutputTokens', parseInt(e.target.value))}
            className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

         {/* Top K */}
         <div className="space-y-2">
           <div className="flex justify-between items-center">
             <label className="text-xs font-semibold text-gray-500 uppercase">Top K</label>
             <input 
                type="number" 
                value={config.topK}
                onChange={(e) => handleChange('topK', parseInt(e.target.value))}
                className="w-16 bg-gray-900 border border-gray-700 text-right text-xs rounded p-1 text-gray-300"
             />
          </div>
        </div>

         {/* Top P */}
         <div className="space-y-2">
           <div className="flex justify-between items-center">
             <label className="text-xs font-semibold text-gray-500 uppercase">Top P</label>
             <input 
                type="number" 
                value={config.topP}
                onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
                className="w-16 bg-gray-900 border border-gray-700 text-right text-xs rounded p-1 text-gray-300"
                step="0.05"
                max="1"
             />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-850">
           <div className="p-3 bg-blue-900/20 border border-blue-900/50 rounded text-xs text-blue-200">
             Using <strong>{AVAILABLE_MODELS.find(m => m.id === config.modelName)?.name}</strong>. Charges may apply depending on your Google Cloud project billing.
           </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPanel;