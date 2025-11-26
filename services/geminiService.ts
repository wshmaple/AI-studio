import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { ChatMessage, ModelConfig, Role } from '../types';

interface StreamUpdate {
  text: string;
  groundingMetadata?: any;
  usageMetadata?: any;
}

export const streamGeminiResponse = async (
  history: ChatMessage[],
  currentPrompt: string,
  images: string[],
  config: ModelConfig,
  onUpdate: (update: StreamUpdate) => void,
  signal?: AbortSignal
): Promise<string> => {
  
  try {
    // Initialize the API client inside the request to ensure latest key and avoid top-level crashes
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = config.modelName;
    
    // Convert UI messages to API format
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [
        ...((msg.images || []).map(img => ({
          inlineData: { mimeType: 'image/jpeg', data: img.split(',')[1] }
        } as Part))),
        { text: msg.text } as Part
      ]
    }));

    // Add the new user message
    const newParts: Part[] = [];
    if (images.length > 0) {
      images.forEach(img => {
        // Remove data URL prefix if present for the API
        const base64Data = img.split(',')[1]; 
        newParts.push({
          inlineData: {
            mimeType: 'image/png', // Simplified for demo, ideally detect type
            data: base64Data
          }
        });
      });
    }
    newParts.push({ text: currentPrompt });
    
    contents.push({
      role: Role.USER,
      parts: newParts
    });

    const generationConfig: any = {
      temperature: config.temperature,
      topP: config.topP,
      topK: config.topK,
      maxOutputTokens: config.maxOutputTokens,
    };

    const toolConfig: any = {};
    if (config.enableGoogleSearch) {
      toolConfig.tools = [{ googleSearch: {} }];
    }

    if (config.systemInstruction) {
      generationConfig.systemInstruction = config.systemInstruction;
    }

    // Handle "Thinking" models config adjustment if selected
    if (modelId.includes('thinking')) {
       // Only available on 2.5 series thinking models
       generationConfig.thinkingConfig = { thinkingBudget: 1024 }; 
       // Note: maxOutputTokens must be > thinkingBudget. 
       if (config.maxOutputTokens < 2048) {
         generationConfig.maxOutputTokens = 4096;
       }
    }

    const responseStream = await ai.models.generateContentStream({
      model: modelId,
      contents: contents,
      config: {
        ...generationConfig,
        ...toolConfig
      }
    });

    let fullText = '';
    let foundMetadata: any = null;

    for await (const chunk of responseStream) {
      if (signal?.aborted) {
        throw new Error("Aborted by user");
      }

      const c = chunk as GenerateContentResponse;
      const text = c.text; 
      
      // Check for grounding metadata
      const grounding = c.candidates?.[0]?.groundingMetadata;
      if (grounding && !foundMetadata) {
        foundMetadata = grounding;
      }
      
      // Check for usage metadata
      const usage = c.usageMetadata;

      if (text || usage) {
        fullText += (text || '');
        onUpdate({ 
          text: fullText, 
          groundingMetadata: foundMetadata,
          usageMetadata: usage 
        });
      }
    }

    return fullText;

  } catch (error: any) {
    if (error.message === "Aborted by user") {
      return "Stopped by user."; // Return partial text ideally, but here just stop.
    }
    console.error("Gemini API Error:", error);
    throw error;
  }
};