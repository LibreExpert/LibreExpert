import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/experts
export async function GET() {
  try {
    const experts = await prisma.expert.findMany();
    return NextResponse.json(experts);
  } catch (error) {
    console.error('Error fetching experts:', error);
    return NextResponse.json({ error: 'Failed to fetch experts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received expert data:', body);

    // Убедимся, что все числовые поля являются числами
    const expertData = {
      name: body.name,
      description: body.description || '',
      systemPrompt: body.systemPrompt || '',
      model: body.model,
      provider: body.provider,
      temperature: Number(body.temperature) || 0.7,
      presencePenalty: Number(body.presencePenalty) || 0,
      frequencyPenalty: Number(body.frequencyPenalty) || 0,
      topP: Number(body.topP) || 1,
      capabilities: body.capabilities || {
        webBrowsing: false,
        imageGeneration: false,
        codeInterpreter: false
      },
    };

    console.log('Processed expert data:', expertData);

    const expert = await prisma.expert.create({
      data: expertData
    });

    console.log('Created expert:', expert);
    return NextResponse.json(expert);
  } catch (error) {
    console.error('Detailed error:', error);
    return NextResponse.json({ 
      error: 'Failed to create expert',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
