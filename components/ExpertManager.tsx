'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import CreateAssistant from './CreateAssistant';
import { Pencil, Trash2, Plus } from 'lucide-react';
import defaultExperts from '@/config/experts.json';

interface AssistantConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  provider: 'openai' | 'google';
  temperature: number;
  presence_penalty: number;
  frequency_penalty: number;
  top_p: number;
  capabilities: {
    webBrowsing: boolean;
    imageGeneration: boolean;
    codeInterpreter: boolean;
  };
}

export default function ExpertManager() {
  const [experts, setExperts] = useState<AssistantConfig[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<AssistantConfig | undefined>(undefined);
  const [isCreateMode, setIsCreateMode] = useState(false);

  // Загрузка данных из API после монтирования компонента
  useEffect(() => {
    const fetchExperts = async () => {
      try {
        const response = await fetch('/api/experts');
        if (!response.ok) {
          throw new Error('Failed to fetch experts');
        }
        const data = await response.json();
        setExperts(
          data.experts.map((expert: any): AssistantConfig => ({
            ...expert,
            provider: expert.provider as 'openai' | 'google',
            capabilities: expert.capabilities || {
              webBrowsing: false,
              imageGeneration: false,
              codeInterpreter: false,
            },
          }))
        );
      } catch (error) {
        console.error('Error fetching experts:', error);
        toast.error('Ошибка при загрузке экспертов');
      }
    };
    
    fetchExperts();
  }, []);

  // Обновляем эксперта через API
  const updateExpert = async (expert: AssistantConfig) => {
    try {
      const response = await fetch(`/api/experts/${expert.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expert),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update expert');
      }
      
      // Обновляем локальное состояние после успешного обновления
      setExperts(prev => prev.map(e => e.id === expert.id ? expert : e));
      toast.success('Эксперт успешно обновлен');
    } catch (error) {
      console.error('Error updating expert:', error);
      toast.error('Ошибка при обновлении эксперта');
    }
  };

  // Удаляем эксперта через API
  const handleDeleteExpert = async (expertId: string) => {
    try {
      const response = await fetch(`/api/experts/${expertId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete expert');
      }
      
      // Обновляем локальное состояние после успешного удаления
      setExperts(prev => prev.filter(expert => expert.id !== expertId));
      toast.success('Эксперт успешно удален');
    } catch (error) {
      console.error('Error deleting expert:', error);
      toast.error('Ошибка при удалении эксперта');
    }
  };

  const handleEditExpert = (expert: AssistantConfig) => {
    setSelectedExpert(expert);
    setIsCreateMode(true);
  };

  const handleCreateNewExpert = () => {
    setSelectedExpert(undefined);
    setIsCreateMode(true);
  };

  const handleSaveComplete = () => {
    setIsCreateMode(false);
    setSelectedExpert(undefined);
  };

  if (isCreateMode) {
    return (
      <CreateAssistant
        initialConfig={selectedExpert}
        onSave={handleSaveComplete}
      />
    );
  }

  return (
    <div className="py-8 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Управление экспертами</h2>
        <Button onClick={handleCreateNewExpert}>
          <Plus className="mr-2 h-4 w-4" />
          Создать нового эксперта
        </Button>
      </div>

      <div className="space-y-4">
        {experts.map((expert) => (
          <Card key={expert.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{expert.name}</h3>
                <p className="text-sm text-muted-foreground">{expert.description}</p>
                <div className="mt-2 flex gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      expert.provider === 'openai'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {expert.provider === 'openai' ? 'OpenAI' : 'Google'}
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    {expert.model}
                  </span>
                  {expert.capabilities?.webBrowsing && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Web
                    </span>
                  )}
                  {expert.capabilities?.imageGeneration && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Image
                    </span>
                  )}
                  {expert.capabilities?.codeInterpreter && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      Code
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEditExpert(expert)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDeleteExpert(expert.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
