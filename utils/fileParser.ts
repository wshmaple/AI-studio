import { ProjectFile } from '../types';

/**
 * Parses text containing <file path="...">content</file> tags.
 */
export const parseFilesFromResponse = (text: string): ProjectFile[] => {
  const files: ProjectFile[] = [];
  
  // Regex to match <file path="path">content</file>
  // using [\s\S] to match newlines
  const fileRegex = /<file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/file>/g;
  
  let match;
  while ((match = fileRegex.exec(text)) !== null) {
    const path = match[1];
    let content = match[2];
    
    // Clean up content: remove leading newline if present immediately after tag
    if (content.startsWith('\n')) content = content.substring(1);
    
    // Determine language based on extension
    const ext = path.split('.').pop()?.toLowerCase() || 'text';
    let language = 'text';
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) language = 'javascript';
    else if (['html'].includes(ext)) language = 'html';
    else if (['css'].includes(ext)) language = 'css';
    else if (['json'].includes(ext)) language = 'json';
    else if (['py'].includes(ext)) language = 'python';

    files.push({
      path,
      content,
      language
    });
  }

  return files;
};