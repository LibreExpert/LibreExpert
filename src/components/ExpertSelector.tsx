import { ScrollArea } from "@/components/ui/scroll-area"
import { useState, useEffect } from 'react'
import defaultExperts from '@/config/experts.json'

interface Expert {
  id: string
  name: string
  description: string
  model: string
  temperature: number
  presence_penalty: number
  frequency_penalty: number
  top_p: number
  systemPrompt: string
  capabilities?: {
    webBrowsing: boolean
    imageGeneration: boolean
    codeInterpreter: boolean
  }
}

interface ExpertSelectorProps {
  onSelect: (expert: Expert) => void
  selectedExpertId: string | null
}

export function ExpertSelector({ onSelect, selectedExpertId }: ExpertSelectorProps) {
  const [experts, setExperts] = useState<Expert[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('experts')
      if (stored) {
        setExperts(JSON.parse(stored))
      } else {
        // Если в localStorage ничего нет, используем данные из файла
        const defaultExpertsWithCapabilities = defaultExperts.experts.map(expert => ({
          ...expert,
          capabilities: {
            webBrowsing: false,
            imageGeneration: false,
            codeInterpreter: false
          }
        }))
        setExperts(defaultExpertsWithCapabilities)
      }
    } catch (error) {
      console.error('Error loading experts:', error)
      setExperts(defaultExperts.experts)
    }
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
