'use client'

import { useState, useEffect } from 'react'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card } from "./ui/card"
import { toast } from 'sonner'

interface ApiKeyState {
  openai: string;
  google: string;
}

export default function Settings() {
  const [apiKeys, setApiKeys] = useState<ApiKeyState>({
    openai: '',
    google: '',
  });

  const [hasKeys, setHasKeys] = useState<Record<string, boolean>>({
    openai: false,
    google: false,
  });

  useEffect(() => {
    // Загружаем информацию о существующих ключах
    const loadKeys = async () => {
      try {
        const response = await fetch('/api/keys');
        if (!response.ok) {
          throw new Error('Failed to fetch API keys');
        }
        const data = await response.json();
        const newHasKeys = { ...hasKeys };
        data.forEach((k: { provider: string }) => {
          newHasKeys[k.provider] = true;
        });
        setHasKeys(newHasKeys);
      } catch (error) {
        console.error('Error loading API keys:', error);
        toast.error('Ошибка при загрузке информации об API ключах');
      }
    };

    loadKeys();
  }, []);

  const handleInputChange = (provider: keyof ApiKeyState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: e.target.value
    }));
  };

  const handleSave = async (provider: keyof ApiKeyState) => {
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          key: apiKeys[provider],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save API key');
      }

      setHasKeys(prev => ({
        ...prev,
        [provider]: true
      }));
      setApiKeys(prev => ({
        ...prev,
        [provider]: ''
      }));
      toast.success('API ключ успешно сохранен');
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Ошибка при сохранении API ключа');
    }
  };

  const handleDelete = async (provider: keyof ApiKeyState) => {
    try {
      const response = await fetch(`/api/keys/${provider}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }

      setHasKeys(prev => ({
        ...prev,
        [provider]: false
      }));
      toast.success('API ключ успешно удален');
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Ошибка при удалении API ключа');
    }
  };

  return (
    <div className="py-8 space-y-4">
      <h2 className="text-2xl font-bold">Настройки</h2>
      <Card className="p-6 space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">API Ключи</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="password"
                placeholder="OpenAI API Key"
                value={apiKeys.openai}
                onChange={handleInputChange('openai')}
              />
              {hasKeys.openai ? (
                <Button variant="destructive" onClick={() => handleDelete('openai')}>
                  Удалить
                </Button>
              ) : (
                <Button onClick={() => handleSave('openai')} disabled={!apiKeys.openai}>
                  Сохранить
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Input
                type="password"
                placeholder="Google API Key"
                value={apiKeys.google}
                onChange={handleInputChange('google')}
              />
              {hasKeys.google ? (
                <Button variant="destructive" onClick={() => handleDelete('google')}>
                  Удалить
                </Button>
              ) : (
                <Button onClick={() => handleSave('google')} disabled={!apiKeys.google}>
                  Сохранить
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
