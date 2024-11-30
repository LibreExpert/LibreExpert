import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: {
        lastActivity: 'desc'
      }
    });
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const chat = await prisma.chat.create({
      data: {
        expertId: body.expertId,
        title: body.title,
        messages: body.messages,
        lastActivity: new Date(),
      }
    });
    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
