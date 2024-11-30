export type ModelProvider = 'openai' | 'google';

export interface Expert {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    avatar?: string;
    model: string;
    temperature: number;
    presence_penalty: number;
    frequency_penalty: number;
    top_p: number;
    provider: ModelProvider;
}
