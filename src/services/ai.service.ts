import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

export class AIService {
  private model: ChatOpenAI;

  constructor(apiKey: string, modelName: string, temperature: number, presencePenalty: number, frequencyPenalty: number, topP: number) {
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: modelName,
      temperature: temperature,
      presencePenalty: presencePenalty,
      frequencyPenalty: frequencyPenalty,
      topP: topP,
    });
  }

  async generateResponse(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string> {
    try {
      const formattedMessages: BaseMessage[] = [
        new SystemMessage(systemPrompt),
        ...messages.map(msg => {
          switch (msg.role) {
            case 'user':
              return new HumanMessage(msg.content);
            case 'assistant':
              return new AIMessage(msg.content);
            default:
              throw new Error(`Unknown message role: ${msg.role}`);
          }
        })
      ];

      const response = await this.model.invoke(formattedMessages);
      return response.content.toString();
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }
}
