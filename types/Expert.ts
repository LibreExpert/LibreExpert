export interface Expert {
  id: string;
  name: string;
  description: string;
  model: string;
  provider: 'openai' | 'google';
  temperature: number;
  presence_penalty: number;
  frequency_penalty: number;
  top_p: number;
  systemPrompt: string;
  capabilities?: {
    webBrowsing: boolean;
    imageGeneration: boolean;
    codeInterpreter: boolean;
  };
}
