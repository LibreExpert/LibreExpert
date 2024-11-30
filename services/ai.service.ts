import { ChatOpenAI } from "@langchain/openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from "@langchain/core/messages";

interface MessageContentText {
  text: string;
}

export class AIService {
  private openaiModel: ChatOpenAI | null = null;
  private geminiModel: GoogleGenerativeAI | null = null;
  private provider: 'openai' | 'google';

  constructor(
    apiKey: string,
    model: string,
    temperature: number,
    presencePenalty: number,
    frequencyPenalty: number,
    topP: number,
    provider: 'openai' | 'google'
  ) {
    this.provider = provider;

    if (provider === 'openai') {
      this.openaiModel = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: model,
        temperature: temperature,
        presencePenalty: presencePenalty,
        frequencyPenalty: frequencyPenalty,
        topP: topP,
      });
    } else {
      this.geminiModel = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateResponse(
    systemPrompt: string,
    messages: BaseMessage[]
  ): Promise<string> {
    try {
      if (this.provider === 'openai' && this.openaiModel) {
        const fullMessages = [new SystemMessage(systemPrompt), ...messages];
        const response = await this.openaiModel.invoke(fullMessages);
        if (typeof response.content === 'string') {
          return response.content;
        }
        if (Array.isArray(response.content)) {
          return response.content
            .filter((item): item is MessageContentText => 'text' in item)
            .map(item => item.text)
            .join('');
        }
        return '';
      } else if (this.provider === 'google' && this.geminiModel) {
        const model = this.geminiModel.getGenerativeModel({ model: "gemini-pro" });
        
        // Convert messages to text format that Gemini understands
        const prompt = messages
          .map(msg => `${msg._getType()}: ${msg.content}`)
          .join('\n');
        
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
      }
      throw new Error('No valid AI model initialized');
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }
}
