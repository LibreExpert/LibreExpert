'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ExpertSelector } from '@/components/ExpertSelector'
import type { Expert } from '@/types/expert'

export default function NewChatPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [browserId, setBrowserId] = useState<string | null>(null)

  useEffect(() => {
    // Получаем browser ID из localStorage
    const storedBrowserId = localStorage.getItem('browser_id')
    if (storedBrowserId) {
      setBrowserId(storedBrowserId)
    }
  }, [])

  const handleExpertSelect = async (expert: Expert) => {
    if (!browserId) {
      setError('Browser ID not found')
      return
    }

    try {
      setLoading(true)

      // Сохраняем выбранного эксперта
      localStorage.setItem('selected_expert_id', expert.id)

      // Создаем новый чат с выбранным экспертом
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expertId: expert.id,
          title: expert.name,
          browserId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create chat')
      }

      const chat = await response.json()
      
      // Перенаправляем на главную страницу
      router.push('/')
    } catch (error) {
      console.error('Error creating chat:', error)
      setError('Failed to create chat')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-red-500 text-center">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-8 text-center">Выберите эксперта для нового чата</h1>
        
        <div className="mb-4">
          <ExpertSelector
            onSelect={handleExpertSelect}
            selectedExpertId={null}
          />
        </div>
      </div>
    </div>
  )
}
