import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';

type ModelProvider = 'openai' | 'google';

export class AIService {
  private openai?: ChatOpenAI;
  private gemini?: ChatGoogleGenerativeAI;
  private provider: ModelProvider;

  constructor(
    apiKey: string,
    model: string,
    temperature: number,
    presence_penalty: number,
    frequency_penalty: number,
    top_p: number,
    provider: ModelProvider
  ) {
    this.provider = provider;

    if (provider === 'openai') {
      this.openai = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: model,
        temperature,
        presencePenalty: presence_penalty,
        frequencyPenalty: frequency_penalty,
        topP: top_p,
      });
    } else {
      const isFlashModel = model.includes('flash');
      this.gemini = new ChatGoogleGenerativeAI({
        apiKey,
        modelName: model,
        maxOutputTokens: isFlashModel ? 1024 : 2048,
        temperature,
        topP: top_p,
      });
    }
  }

  async generateResponse(systemPrompt: string, messages: (HumanMessage | AIMessage | SystemMessage)[]): Promise<string> {
    try {
      const formattedMessages: BaseMessage[] = [
        new SystemMessage(systemPrompt),
        ...messages
      ];

      if (this.provider === 'openai') {
        const response = await this.openai!.invoke(formattedMessages);
        return response.content.toString();
      } else {
        const response = await this.gemini!.invoke(formattedMessages);
        return response.content.toString();
      }
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }
}
