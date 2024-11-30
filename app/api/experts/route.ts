import { NextResponse } from 'next/server'
import path from 'path'
import { promises as fs } from 'fs'
import { Expert } from '@/types/expert'

// Путь к файлу конфигурации экспертов
const expertsPath = path.join(process.cwd(), 'config/experts.json')

// GET /api/experts
export async function GET() {
  try {
    const fileContents = await fs.readFile(expertsPath, 'utf8')
    const experts = JSON.parse(fileContents)
    return NextResponse.json(experts)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load experts configuration' },
      { status: 500 }
    )
  }
}
