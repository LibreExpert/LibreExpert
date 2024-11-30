import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Props {
  params: { provider: string }
}

export async function GET(request: Request, { params }: Props) {
  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { provider: params.provider }
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({ key: apiKey.key });
  } catch (error) {
    console.error('Error fetching API key:', error);
    return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Props) {
  try {
    await prisma.apiKey.delete({
      where: { provider: params.provider }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}
