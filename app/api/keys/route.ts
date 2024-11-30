import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const keys = await prisma.apiKey.findMany();
    // Возвращаем только провайдеров, без самих ключей
    return NextResponse.json(keys.map(k => ({ provider: k.provider })));
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, key } = body;

    if (!provider || !key) {
      return NextResponse.json({ error: 'Provider and key are required' }, { status: 400 });
    }

    // Используем upsert для обновления существующего ключа или создания нового
    const apiKey = await prisma.apiKey.upsert({
      where: { provider },
      update: { key },
      create: { provider, key },
    });

    return NextResponse.json({ provider: apiKey.provider });
  } catch (error) {
    console.error('Error saving API key:', error);
    return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
  }
}
