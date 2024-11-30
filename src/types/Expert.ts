export interface Expert {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  presence_penalty: number;
  frequency_penalty: number;
  top_p: number;
}
