import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DocumentService } from '@/services/document.service'

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
    const formData = await request.formData();
    
    // Create update object from form data
    const updateData: any = {};
    
    // Handle string fields
    const stringFields = ['name', 'description', 'systemPrompt', 'model', 'provider', 'api_key'];
    stringFields.forEach(field => {
      const value = formData.get(field);
      if (value !== null) {
        updateData[field] = value;
      }
    });

    // Handle numeric fields
    const numericFields = ['temperature', 'presencePenalty', 'frequencyPenalty', 'topP'];
    numericFields.forEach(field => {
      const value = formData.get(field);
      if (value !== null) {
        updateData[field] = parseFloat(value as string);
      }
    });

    // Update expert
    const expert = await prisma.expert.update({
      where: {
        id: params.id
      },
      data: updateData
    });

    // Handle file uploads if present
    const files = formData.getAll('files');
    if (files.length > 0 && updateData.api_key) {
      const documentService = new DocumentService(updateData.api_key);

      for (const file of files) {
        if (file instanceof File) {
          const content = await file.text();
          await documentService.processDocument(expert.id, file.name, content);
        }
      }
    }

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
