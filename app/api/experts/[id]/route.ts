import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { Expert } from '@/types/expert'

const expertsPath = path.join(process.cwd(), 'config/experts.json')

// PUT /api/experts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expert = await request.json()
    const fileContents = await fs.readFile(expertsPath, 'utf8')
    const data = JSON.parse(fileContents)
    
    const expertIndex = data.experts.findIndex((e: Expert) => e.id === params.id)
    if (expertIndex === -1) {
      return NextResponse.json(
        { error: 'Expert not found' },
        { status: 404 }
      )
    }

    data.experts[expertIndex] = expert
    await fs.writeFile(expertsPath, JSON.stringify(data, null, 2))

    return NextResponse.json(expert)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update expert' },
      { status: 500 }
    )
  }
}

// DELETE /api/experts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileContents = await fs.readFile(expertsPath, 'utf8')
    const data = JSON.parse(fileContents)
    
    const expertIndex = data.experts.findIndex((e: Expert) => e.id === params.id)
    if (expertIndex === -1) {
      return NextResponse.json(
        { error: 'Expert not found' },
        { status: 404 }
      )
    }

    data.experts.splice(expertIndex, 1)
    await fs.writeFile(expertsPath, JSON.stringify(data, null, 2))

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete expert' },
      { status: 500 }
    )
  }
}
