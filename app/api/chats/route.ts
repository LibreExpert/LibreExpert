import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { searchRelevantChunks } from '@/services/document.service';
import { AIService } from '@/services/ai.service';
import { SystemMessage } from '@langchain/core/messages';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

interface ChatWithMessages {
  id: string;
  expertId: string;
  browserId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
}

type Chat = ChatWithMessages;

async function generateWelcomeMessage(expert: { 
  systemPrompt: string | null; 
  model: string;
  provider: string;
  api_key: string;
  temperature: number;
  presencePenalty: number;
  frequencyPenalty: number;
  topP: number;
}): Promise<string> {
  const aiService = new AIService(
    expert.api_key,
    expert.model,
    expert.temperature,
    expert.presencePenalty,
    expert.frequencyPenalty,
    expert.topP,
    expert.provider as 'openai' | 'google'
  );

  const systemPrompt = expert.systemPrompt || 'You are a helpful AI assistant.';
  const welcomePrompt = `${systemPrompt}\n\nGenerate a brief, friendly welcome message to start the conversation. Be concise and engaging.`;
  
  return await aiService.generateResponse(welcomePrompt, []);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const browserId = searchParams.get('browserId');

    if (!browserId) {
      return NextResponse.json({ error: 'Browser ID is required' }, { status: 400 });
    }

    const chats = await prisma.chat.findMany({
      where: {
        browserId: browserId
      },
      include: {
        messages: true
      },
      orderBy: {
        lastActivity: 'desc'
      }
    });
    
    const formattedChats = chats.map((chat: ChatWithMessages) => ({
      id: chat.id,
      expertId: chat.expertId,
      browserId: chat.browserId,
      title: chat.title,
      messages: chat.messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt.getTime()
      })),
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      lastActivity: chat.lastActivity
    }));

    return NextResponse.json(formattedChats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.browserId || !body.expertId) {
      return NextResponse.json({ error: 'Browser ID and Expert ID are required' }, { status: 400 });
    }

    // First get the expert to access their system prompt and settings
    const expert = await prisma.expert.findUnique({
      where: {
        id: body.expertId
      }
    });

    if (!expert) {
      return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
    }

    // Create the chat
    const chat = await prisma.chat.create({
      data: {
        expert: {
          connect: {
            id: body.expertId
          }
        },
        browserId: body.browserId,
        title: body.title || ''
      },
      include: {
        messages: true
      }
    });

    // Generate and store welcome message
    const welcomeMessage = await generateWelcomeMessage(expert);
    
    await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: welcomeMessage
      }
    });

    // Fetch the updated chat with the welcome message
    const updatedChat = await prisma.chat.findUnique({
      where: {
        id: chat.id
      },
      include: {
        messages: true
      }
    }) as ChatWithMessages;

    if (!updatedChat) {
      throw new Error('Failed to fetch updated chat');
    }

    return NextResponse.json({
      id: updatedChat.id,
      expertId: updatedChat.expertId,
      browserId: updatedChat.browserId,
      title: updatedChat.title,
      messages: updatedChat.messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt.getTime()
      })),
      createdAt: updatedChat.createdAt,
      updatedAt: updatedChat.updatedAt,
      lastActivity: updatedChat.lastActivity
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.id || !Array.isArray(body.messages)) {
      return NextResponse.json({ error: 'Chat ID and messages array are required' }, { status: 400 });
    }

    // Get the last user message
    const lastUserMessage = [...body.messages].reverse().find(msg => msg.role === 'user');
    
    // If we have a user message, search for relevant chunks
    let relevantChunks: { content: string; similarity: number }[] = [];
    if (lastUserMessage) {
      relevantChunks = await searchRelevantChunks(body.expertId, lastUserMessage.content);
    }

    // Update chat's last activity
    const chat = await prisma.chat.update({
      where: {
        id: body.id
      },
      data: {
        title: body.title,
        lastActivity: new Date()
      }
    });

    // Delete existing messages
    await prisma.message.deleteMany({
      where: {
        chatId: body.id
      }
    });

    // Create new messages
    if (body.messages.length > 0) {
      // Add system message with context if we have relevant chunks
      if (relevantChunks.length > 0) {
        const contextMessage = {
          chatId: body.id,
          role: 'system' as const,
          content: 'Here is some relevant context from the documents:\n\n' + 
                  relevantChunks.map(chunk => chunk.content).join('\n\n') +
                  '\n\nPlease use this context to help answer the user\'s question.'
        };
        
        await prisma.message.createMany({
          data: [contextMessage, ...body.messages.map((msg: Message) => ({
            chatId: body.id,
            role: msg.role,
            content: msg.content
          }))]
        });
      } else {
        await prisma.message.createMany({
          data: body.messages.map((msg: Message) => ({
            chatId: body.id,
            role: msg.role,
            content: msg.content
          }))
        });
      }
    }

    // Fetch updated chat with messages
    const updatedChat = await prisma.chat.findUnique({
      where: {
        id: body.id
      },
      include: {
        messages: true
      }
    }) as ChatWithMessages;

    if (!updatedChat) {
      throw new Error('Failed to fetch updated chat');
    }

    return NextResponse.json({
      id: updatedChat.id,
      expertId: updatedChat.expertId,
      browserId: updatedChat.browserId,
      title: updatedChat.title,
      messages: updatedChat.messages.map((msg: Message) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt.getTime()
      })),
      createdAt: updatedChat.createdAt,
      updatedAt: updatedChat.updatedAt,
      lastActivity: updatedChat.lastActivity
    });
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}
