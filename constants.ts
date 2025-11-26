import { ModelConfig } from './types';

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview' },
  { id: 'gemini-2.5-flash-thinking-preview', name: 'Gemini 2.5 Flash Thinking' },
];

export const SYSTEM_INSTRUCTION_CODE_GEN = `
When asked to generate code for an application or project, please output multiple files using the following XML format:

<file path="src/App.tsx">
import React from 'react';
...
</file>

<file path="package.json">
{
  "name": "my-app",
  ...
}
</file>

Always provide the full path including the directory.
`;

export const DEFAULT_CONFIG: ModelConfig = {
  modelName: 'gemini-2.5-flash',
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  systemInstruction: SYSTEM_INSTRUCTION_CODE_GEN,
  enableGoogleSearch: false,
};

export const MOCK_HISTORY = [
  { id: '1', title: 'Creative Writing Assistant', date: 'Today' },
  { id: '2', title: 'Python Code Generator', date: 'Yesterday' },
  { id: '3', title: 'Data Analysis Helper', date: '3 days ago' },
];