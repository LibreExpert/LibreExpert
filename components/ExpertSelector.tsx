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
  const [isSelecting, setIsSelecting] = useState(false);

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
        <div className="text-[#FFFFFF]">Загрузка экспертов...</div>
      </div>
    );
  }

  if (experts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[#FFFFFF]">Нет доступных экспертов.</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] w-full rounded-lg border border-[#565869] p-4 bg-[#343541]">
      <div className="space-y-4">
        {experts.map((expert) => (
          <div
            key={expert.id}
            className={`p-4 rounded-lg border transition-all ${
              selectedExpertId === expert.id
                ? 'bg-[#444654] text-[#FFFFFF] border-[#10A37F]'
                : 'bg-[#343541] text-[#FFFFFF] border-[#565869] hover:bg-[#2A2B32]'
            } ${isSelecting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}`}
            onClick={async () => {
              if (isSelecting) return;
              setIsSelecting(true);
              try {
                await onSelect(expert);
              } finally {
                setIsSelecting(false);
              }
            }}
          >
            <h3 className="font-semibold text-lg text-[#FFFFFF]">{expert.name}</h3>
            <p className="text-sm mt-1 text-[#ACB2C0]">{expert.description}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
