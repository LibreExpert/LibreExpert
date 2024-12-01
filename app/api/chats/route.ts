import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

interface DbChat {
  id: string;
  expert_id: string;
  browser_id: string;
  title: string;
  messages: string;
  created_at: Date;
  updated_at: Date;
  last_activity: Date;
  problem_resolved: boolean;
}

interface Chat {
  id: string;
  expertId: string;
  browserId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  problemResolved: boolean;
}

function mapDbChatToChat(dbChat: DbChat): Chat {
  return {
    id: dbChat.id,
    expertId: dbChat.expert_id,
    browserId: dbChat.browser_id,
    title: dbChat.title,
    messages: JSON.parse(dbChat.messages),
    createdAt: dbChat.created_at,
    updatedAt: dbChat.updated_at,
    lastActivity: dbChat.last_activity,
    problemResolved: dbChat.problem_resolved
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const browserId = searchParams.get('browserId');

    if (!browserId) {
      return NextResponse.json({ error: 'Browser ID is required' }, { status: 400 });
    }

    const chats = await prisma.$queryRaw<DbChat[]>`
      SELECT 
        id, 
        expert_id,
        browser_id,
        title,
        messages::text as messages,
        created_at,
        updated_at,
        last_activity,
        problem_resolved
      FROM chats 
      WHERE browser_id = ${browserId}
      ORDER BY last_activity DESC
    `;
    
    // Parse messages JSON for each chat
    const parsedChats = chats.map(mapDbChatToChat);

    return NextResponse.json(parsedChats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.browserId) {
      return NextResponse.json({ error: 'Browser ID is required' }, { status: 400 });
    }

    const chat = await prisma.$queryRaw<DbChat[]>`
      INSERT INTO chats (
        id,
        expert_id,
        browser_id,
        title,
        messages,
        created_at,
        updated_at,
        last_activity,
        problem_resolved
      ) VALUES (
        ${randomUUID()},
        ${body.expertId},
        ${body.browserId},
        ${body.title},
        ${JSON.stringify(body.messages)}::json,
        NOW(),
        NOW(),
        NOW(),
        false
      )
      RETURNING 
        id, 
        expert_id,
        browser_id,
        title,
        messages::text as messages,
        created_at,
        updated_at,
        last_activity,
        problem_resolved
    `;

    const parsedChat = mapDbChatToChat(chat[0]);

    return NextResponse.json(parsedChat);
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.id || !body.browserId) {
      return NextResponse.json({ error: 'Chat ID and Browser ID are required' }, { status: 400 });
    }

    const chat = await prisma.$queryRaw<DbChat[]>`
      UPDATE chats 
      SET 
        messages = ${JSON.stringify(body.messages)}::json,
        last_activity = NOW(),
        updated_at = NOW()
      WHERE id = ${body.id} AND browser_id = ${body.browserId}
      RETURNING 
        id, 
        expert_id,
        browser_id,
        title,
        messages::text as messages,
        created_at,
        updated_at,
        last_activity,
        problem_resolved
    `;

    const parsedChat = mapDbChatToChat(chat[0]);

    return NextResponse.json(parsedChat);
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json({ error: 'Failed to update chat' }, { status: 500 });
  }
}
