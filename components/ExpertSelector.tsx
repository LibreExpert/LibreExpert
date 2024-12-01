'use client'

import { ScrollArea } from '../components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { Expert } from '@/types/expert';

interface ExpertSelectorProps {
  onSelect: (expert: Expert) => void;
  selectedExpertId: string | null;
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
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExperts = async () => {
      try {
        const response = await fetch('/api/experts');
        if (!response.ok) {
          throw new Error('Failed to fetch experts');
        }
        const data = await response.json();
        setExperts(data);
      } catch (error) {
        console.error('Error loading experts:', error);
        setExperts([]); // В случае ошибки устанавливаем пустой массив
      } finally {
        setLoading(false);
      }
    };

    loadExperts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Загрузка экспертов...</div>
      </div>
    );
  }

  if (experts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-white">Нет доступных экспертов.</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full rounded-lg border border-gray-700 p-4 bg-gray-800 shadow-md">
      <div className="space-y-4">
        {experts.map((expert) => (
          <div
            key={expert.id}
            className={`p-4 rounded-lg border shadow-sm cursor-pointer transition-all hover:scale-105 ${
              selectedExpertId === expert.id
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
            }`}
            onClick={() => onSelect(expert)}
          >
            <h3 className="font-semibold text-lg">{expert.name}</h3>
            <p className="text-sm mt-1 opacity-80">{expert.description}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
