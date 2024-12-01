'use client'

import { ScrollArea } from "../components/ui/scroll-area"
import { useState, useEffect } from 'react'
import { Expert } from '@/types/expert'

interface ExpertSelectorProps {
  onSelect: (expert: Expert) => void
  selectedExpertId: string | null
}

interface StoredExpert {
  id: string;
  name: string;
  description: string;
  model: string;
  provider: string;
  temperature: number;
  presence_penalty: number;
  frequency_penalty: number;
  top_p: number;
  systemPrompt: string;
  capabilities?: {
    webBrowsing: boolean;
    imageGeneration: boolean;
    codeInterpreter: boolean; 
  };
}

export function ExpertSelector({ onSelect, selectedExpertId }: ExpertSelectorProps) {
  const [experts, setExperts] = useState<Expert[]>([])
  
  useEffect(() => {
    const loadExperts = async () => {
      try {
        const response = await fetch('/api/experts')
        if (!response.ok) {
          throw new Error('Failed to fetch experts')
        }
        const data = await response.json()
        setExperts(data)
      } catch (error) {
        console.error('Error loading experts:', error)
        setExperts([]) // В случае ошибки устанавливаем пустой массив
      }
    }
    
    loadExperts()
  }, [])

  return (
    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
      <div className="space-y-4">
        {experts.map((expert) => (
          <div
            key={expert.id}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              selectedExpertId === expert.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
            onClick={() => onSelect(expert)}
          >
            <h3 className="font-semibold">{expert.name}</h3>
            <p className="text-sm mt-1 opacity-90">{expert.description}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
