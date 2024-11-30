import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { prisma } from '@/lib/prisma';

interface MessageContentText {
  text: string;
}

export class AIService {
  private static async getApiKey(provider: string): Promise<string> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { provider }
    });

    if (!apiKey) {
      throw new Error(`API key for ${provider} not found`);
    }

    return apiKey.key;
  }

  static async createChatModel(model: string, provider: string, temperature: number) {
    const apiKey = await this.getApiKey(provider);

    if (provider === 'openai') {
      return new ChatOpenAI({
        modelName: model,
        temperature,
        openAIApiKey: apiKey,
      });
    } else if (provider === 'google') {
      return new ChatGoogleGenerativeAI({
        modelName: model,
        temperature,
        apiKey,
      });
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  static async chat(messages: any[], model: string, provider: string, temperature: number) {
    try {
      const chatModel = await this.createChatModel(model, provider, temperature);
      const result = await chatModel.invoke(messages);
      return result;
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  }

  async generateResponse(
    systemPrompt: string,
    messages: BaseMessage[]
  ): Promise<string> {
    try {
      const fullMessages = [new SystemMessage(systemPrompt), ...messages];
      const result = await AIService.chat(fullMessages, 'text-davinci-003', 'openai', 0.7);
      if (typeof result.content === 'string') {
        return result.content;
      }
      if (Array.isArray(result.content)) {
        return result.content
          .filter((item): item is MessageContentText => 'text' in item)
          .map(item => item.text)
          .join('');
      }
      return '';
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }
}
