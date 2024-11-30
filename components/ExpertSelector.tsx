'use client'

import { ScrollArea } from "../components/ui/scroll-area"
import { useState, useEffect } from 'react'
import defaultExperts from '@/config/experts.json'
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
    try {
      const stored = localStorage.getItem('experts')
      if (stored) {
        const parsedExperts = JSON.parse(stored) as StoredExpert[];
        const validatedExperts = parsedExperts.map((expert) => ({
          ...expert,
          provider: expert.provider as 'openai' | 'google',
          capabilities: expert.capabilities || {
            webBrowsing: false,
            imageGeneration: false,
            codeInterpreter: false
          }
        }));
        setExperts(validatedExperts);
      } else {
        const defaultExpertsWithCapabilities = defaultExperts.experts.map(expert => ({
          ...expert,
          provider: expert.provider as 'openai' | 'google',
          capabilities: {
            webBrowsing: false,
            imageGeneration: false,
            codeInterpreter: false
          }
        }));
        setExperts(defaultExpertsWithCapabilities);
      }
    } catch (error) {
      console.error('Error loading experts:', error);
      const fallbackExperts = defaultExperts.experts.map(expert => ({
        ...expert,
        provider: expert.provider as 'openai' | 'google',
        capabilities: {
          webBrowsing: false,
          imageGeneration: false,
          codeInterpreter: false
        }
      }));
      setExperts(fallbackExperts);
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
