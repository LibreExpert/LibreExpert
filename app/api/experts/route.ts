import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/experts
export async function GET() {
  try {
    const experts = await prisma.expert.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        systemPrompt: true,
        model: true,
        provider: true,
        temperature: true,
        presencePenalty: true,
        frequencyPenalty: true,
        topP: true,
        capabilities: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    return NextResponse.json(experts);
  } catch (error) {
    console.error('Error fetching experts:', error);
    return NextResponse.json({ error: 'Failed to fetch experts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    console.log('Received expert data:', Object.fromEntries(formData));

    // Parse capabilities from string to JSON if present
    let capabilities = {
      webBrowsing: false,
      imageGeneration: false,
      codeInterpreter: false
    };
    
    const capabilitiesStr = formData.get('capabilities');
    if (capabilitiesStr) {
      try {
        capabilities = JSON.parse(capabilitiesStr as string);
      } catch (e) {
        console.error('Error parsing capabilities:', e);
      }
    }

    // Create expert data object
    const expertData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || '',
      systemPrompt: formData.get('systemPrompt') as string || '',
      model: formData.get('model') as string,
      provider: formData.get('provider') as string,
      api_key: formData.get('api_key') as string,
      temperature: Number(formData.get('temperature')) || 0.7,
      presencePenalty: Number(formData.get('presencePenalty')) || 0,
      frequencyPenalty: Number(formData.get('frequencyPenalty')) || 0,
      topP: Number(formData.get('topP')) || 1,
      capabilities: capabilities
    };

    // Create the expert
    const expert = await prisma.expert.create({
      data: expertData,
      select: {
        id: true,
        name: true,
        description: true,
        systemPrompt: true,
        model: true,
        provider: true,
        temperature: true,
        presencePenalty: true,
        frequencyPenalty: true,
        topP: true,
        capabilities: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(expert);
  } catch (error) {
    console.error('Error creating expert:', error);
    return NextResponse.json({ error: 'Failed to create expert' }, { status: 500 });
  }
}
