export interface TokenUsage {
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
}

export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  images?: string[]; // base64 strings
  isLoading?: boolean;
  usage?: TokenUsage;
}

export interface ModelConfig {
  modelName: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  systemInstruction?: string;
  enableGoogleSearch?: boolean;
}

export interface GenerationState {
  isGenerating: boolean;
  error?: string | null;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  content?: string;
}

// Graph / Canvas Types
export interface GraphNode {
  id: string;
  type: 'user' | 'model' | 'file' | 'tool';
  label: string;
  subLabel?: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  x: number;
  y: number;
  data?: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}