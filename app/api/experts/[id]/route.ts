import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/experts/[id]
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const expert = await prisma.expert.findUnique({
      where: {
        id: params.id
      }
    });

    if (!expert) {
      return NextResponse.json({ error: 'Expert not found' }, { status: 404 });
    }

    return NextResponse.json(expert);
  } catch (error) {
    console.error('Error fetching expert:', error);
    return NextResponse.json({ error: 'Failed to fetch expert' }, { status: 500 });
  }
}

// PUT /api/experts/[id]
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const body = await request.json();
    
    // Создаем объект только с теми полями, которые были переданы
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.systemPrompt !== undefined) updateData.systemPrompt = body.systemPrompt;
    if (body.model !== undefined) updateData.model = body.model;
    if (body.provider !== undefined) updateData.provider = body.provider;
    if (body.api_key !== undefined) updateData.api_key = body.api_key;
    if (body.temperature !== undefined) updateData.temperature = body.temperature;
    if (body.presencePenalty !== undefined) updateData.presencePenalty = body.presencePenalty;
    if (body.frequencyPenalty !== undefined) updateData.frequencyPenalty = body.frequencyPenalty;
    if (body.topP !== undefined) updateData.topP = body.topP;
    if (body.capabilities !== undefined) updateData.capabilities = body.capabilities;

    const expert = await prisma.expert.update({
      where: {
        id: params.id
      },
      data: updateData,
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
    console.error('Error updating expert:', error);
    return NextResponse.json({ error: 'Failed to update expert' }, { status: 500 });
  }
}

// DELETE /api/experts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await prisma.expert.delete({
      where: {
        id: params.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expert:', error);
    return NextResponse.json({ error: 'Failed to delete expert' }, { status: 500 });
  }
}
