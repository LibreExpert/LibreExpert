import { NextRequest, NextResponse } from 'next/server'
import { Expert } from '@/types/expert'
import { AIService } from '@/src/services/ai.service'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, expertId } = body

    // Получаем эксперта из базы данных
    const expert = await prisma.expert.findUnique({
      where: {
        id: expertId
      }
    })

    if (!expert) {
      return NextResponse.json(
        { error: 'Expert not found' },
        { status: 404 }
      )
    }

    // Получаем API ключ из переменных окружения в зависимости от провайдера
    const apiKey = expert.provider === 'openai' 
      ? process.env.OPENAI_API_KEY 
      : process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: `API key not found for ${expert.provider}` },
        { status: 500 }
      )
    }

    // Создаем экземпляр AIService с конфигурацией эксперта
    const aiService = new AIService(
      apiKey,
      expert.model,
      expert.temperature,
      expert.presencePenalty,
      expert.frequencyPenalty,
      expert.topP,
      expert.provider
    )

    // Преобразуем сообщения в формат LangChain
    const formattedMessages = messages.map((msg: any) => 
      msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
    )

    // Генерируем ответ
    const responseContent = await aiService.generateResponse(
      expert.systemPrompt,
      formattedMessages
    )

    return NextResponse.json({
      role: 'assistant',
      content: responseContent
    })

  } catch (error) {
    console.error('Error processing chat request:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
