'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Chat from '@/components/Chat'

function generateBrowserId() {
  return 'browser_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Получаем или генерируем browser ID
    let browserId = localStorage.getItem('browser_id')
    
    if (!browserId) {
      router.push('/new-chat')
      browserId = generateBrowserId()
      localStorage.setItem('browser_id', browserId)
      return;
    }

    const checkChats = async () => {
      console.log('Checking chats...')
      try {
        const response = await fetch(`/api/chats?browserId=${browserId}`)
        const chats = await response.json()
        console.log('Chats:', chats)
        
        // Если нет чатов - перенаправляем на выбор эксперта
        if (chats.length === 0) {
          router.push('/new-chat')
        }
      } catch (error) {
        console.error('Error checking chats:', error)
      }
    }

    checkChats()
  }, [router])

  return <Chat />
}