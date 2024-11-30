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
    const expert = await prisma.expert.update({
      where: {
        id: params.id
      },
      data: {
        name: body.name,
        description: body.description,
        systemPrompt: body.systemPrompt,
        model: body.model,
        provider: body.provider,
        temperature: body.temperature,
        presencePenalty: body.presencePenalty,
        frequencyPenalty: body.frequencyPenalty,
        topP: body.topP,
        capabilities: body.capabilities,
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
