'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import CreateAssistant from './CreateAssistant';
import { Pencil, Trash2, Plus } from 'lucide-react';
import defaultExperts from '@/config/experts.json';

interface Expert {
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
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<Expert | undefined>(undefined);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');

  // Функция для загрузки экспертов
  const loadExperts = async () => {
    try {
      const response = await fetch('/api/experts');
      if (!response.ok) {
        throw new Error('Failed to fetch experts');
      }
      const data = await response.json();
      setExperts(data.map((expert: any): Expert => ({
        ...expert,
        provider: expert.provider as 'openai' | 'google',
        capabilities: expert.capabilities || {
          webBrowsing: false,
          imageGeneration: false,
          codeInterpreter: false,
        },
      })));
    } catch (error) {
      console.error('Error loading experts:', error);
      toast.error('Ошибка при загрузке экспертов');
    }
  };

  // Загружаем экспертов при монтировании компонента
  useEffect(() => {
    loadExperts();
  }, []);

  const handleCreateClick = () => {
    setSelectedExpert(undefined);
    setMode('create');
  };

  const handleEditClick = (expert: Expert) => {
    setSelectedExpert(expert);
    setMode('edit');
  };

  const handleSaveComplete = async () => {
    await loadExperts(); // Перезагружаем список экспертов
    setMode('list');
  };

  const handleDeleteClick = async (expert: Expert) => {
    if (!confirm('Вы уверены, что хотите удалить этого эксперта?')) {
      return;
    }

    try {
      const response = await fetch(`/api/experts/${expert.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete expert');
      }

      toast.success('Эксперт успешно удален');
      await loadExperts(); // Перезагружаем список после удаления
    } catch (error) {
      console.error('Error deleting expert:', error);
      toast.error('Ошибка при удалении эксперта');
    }
  };

  if (mode === 'create' || mode === 'edit') {
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
        <Button onClick={handleCreateClick}>
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
                  onClick={() => handleEditClick(expert)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDeleteClick(expert)}
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
