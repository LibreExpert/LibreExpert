'use client'

import { useState, useEffect } from 'react'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { ScrollArea } from "./ui/scroll-area"
import { Card } from "./ui/card"
import { Send, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { AIService } from '@/services/ai.service'
import { HumanMessage } from '@langchain/core/messages'

interface AssistantConfig {
  id: string;
  model: string;
  provider: 'openai' | 'google';
  temperature: number;
  presence_penalty: number;
  frequency_penalty: number;
  top_p: number;
  name: string;
  description: string;
  systemPrompt: string;
  capabilities: {
    webBrowsing: boolean;
    imageGeneration: boolean;
    codeInterpreter: boolean;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface Props {
  initialConfig?: AssistantConfig;
  onSave?: () => void;
}

export default function CreateAssistant({ initialConfig, onSave }: Props) {
  const [config, setConfig] = useState<AssistantConfig>(
    initialConfig || {
      id: '',
      model: 'gpt-4',
      provider: 'openai',
      temperature: 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0.5,
      top_p: 0.9,
      name: '',
      description: '',
      systemPrompt: '',
      capabilities: {
        webBrowsing: false,
        imageGeneration: false,
        codeInterpreter: false
      }
    }
  )

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [aiService, setAiService] = useState<AIService | null>(null)
  const [experts, setExperts] = useState<AssistantConfig[]>(() => {
    const stored = localStorage.getItem('experts')
    return stored ? JSON.parse(stored) : []
  })
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    const savedOpenAIKey = localStorage.getItem('openai_api_key');
    const savedGeminiKey = localStorage.getItem('gemini_api_key');
    if (config.provider === 'openai' && savedOpenAIKey) {
      setApiKey(savedOpenAIKey);
    } else if (config.provider === 'google' && savedGeminiKey) {
      setApiKey(savedGeminiKey);
    }
  }, [config.provider]);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    if (config.provider === 'openai') {
      localStorage.setItem('openai_api_key', value);
    } else {
      localStorage.setItem('gemini_api_key', value);
    }
  };

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(config.provider === 'openai' ? 'openai_api_key' : 'gemini_api_key', apiKey)
      setAiService(new AIService(
        apiKey,
        config.model,
        config.temperature,
        config.presence_penalty,
        config.frequency_penalty,
        config.top_p,
        config.provider
      ))
    } else {
      setAiService(null)
    }
  }, [apiKey, config])

  const handleSaveExpert = async () => {
    if (!config.name) {
      toast.error('Введите название эксперта')
      return
    }

    try {
      const newExpertId = initialConfig?.id || config.name.toLowerCase().replace(/\s+/g, '-')
      const newExpert = { ...config, id: newExpertId }
      
      const updatedExperts = initialConfig 
        ? experts.map(e => e.id === initialConfig.id ? newExpert : e)
        : [...experts, newExpert]

      setExperts(updatedExperts)
      localStorage.setItem('experts', JSON.stringify(updatedExperts))

      toast.success(initialConfig ? 'Эксперт успешно обновлен' : 'Эксперт успешно создан')
      
      if (!initialConfig) {
        setConfig({
          id: '',
          model: 'gpt-4',
          provider: 'openai',
          temperature: 0.7,
          presence_penalty: 0.6,
          frequency_penalty: 0.5,
          top_p: 0.9,
          name: '',
          description: '',
          systemPrompt: '',
          capabilities: {
            webBrowsing: false,
            imageGeneration: false,
            codeInterpreter: false
          }
        })
      }
      
      setChatMessages([])
      onSave?.()
    } catch (error) {
      console.error('Error saving expert:', error)
      toast.error('Ошибка при сохранении эксперта')
    }
  }

  const testConnection = async () => {
    if (!apiKey) {
      toast.error('API ключ не указан');
      return;
    }

    setTesting(true);
    try {
      const ai = new AIService(
        apiKey,
        config.model,
        config.temperature,
        config.presence_penalty,
        config.frequency_penalty,
        config.top_p,
        config.provider
      );

      const testMessage = new HumanMessage('Привет! Это тестовое сообщение.');
      const response = await ai.generateResponse(config.systemPrompt, [testMessage]);
      
      if (response) {
        toast.success('Соединение успешно установлено');
      }
    } catch (error) {
      console.error('Test connection error:', error);
      toast.error('Ошибка подключения');
    } finally {
      setTesting(false);
    }
  };

  async function handleSendMessage() {
    if (!inputMessage.trim() || !aiService) return

    const newMessage: ChatMessage = {
      role: 'user',
      content: inputMessage
    }

    setChatMessages(prev => [...prev, newMessage])
    setInputMessage('')

    try {
      const messages = [
        { role: 'system', content: config.systemPrompt || 'You are a helpful AI assistant.' },
        ...chatMessages,
        newMessage
      ];
      const humanMessages = messages.map(message => new HumanMessage(message.content));
      const response = await aiService.generateResponse(config.systemPrompt, humanMessages);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response
      }

      setChatMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error generating response:', error)
      toast.error('Не удалось получить ответ')
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-4 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSave?.()}
          className="hover:bg-accent"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Тестирование эксперта</h1>
        </div>
        <Button
          variant="default"
          onClick={handleSaveExpert}
          className="px-4"
        >
          Сохранить
        </Button>
        <Button
          variant="default"
          onClick={testConnection}
          disabled={testing}
          className="px-4"
        >
          {testing ? 'Тестирую...' : 'Тестировать'}
        </Button>
      </header>

      <div className="flex gap-4 h-[calc(100vh-64px)]">
        {/* Left side - Creation mode */}
        <div className="w-1/2 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">API ключ</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder={config.provider === 'openai' ? "sk-..." : "AI..."}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Название эксперта
              </label>
              <Input
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="Введите название"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Описание
              </label>
              <Textarea
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Введите описание"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Системный промпт
              </label>
              <Textarea
                value={config.systemPrompt}
                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                placeholder="Введите системный промпт"
                className="min-h-[200px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Провайдер
              </label>
              <select
                value={config.provider}
                onChange={(e) => {
                  const newProvider = e.target.value as 'openai' | 'google';
                  setConfig({ ...config, provider: newProvider });
                  // Clear API key when switching providers
                  setApiKey('');
                  // Load the appropriate API key
                  const savedKey = localStorage.getItem(newProvider === 'openai' ? 'openai_api_key' : 'gemini_api_key');
                  if (savedKey) {
                    setApiKey(savedKey);
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="openai">OpenAI</option>
                <option value="google">Google Gemini</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Модель
              </label>
              <select
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {config.provider === 'openai' ? (
                  <>
                    <option value="gpt-4o">gpt-4o</option>
                    <option value="gpt-4o-mini">gpt-4o-mini</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                  </>
                ) : (
                  <>
                    <option value="gemini-1.5-flash-latest">gemini-1.5-flash-latest</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Temperature</label>
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={config.temperature}
                    onChange={(e) =>
                      setConfig({ ...config, temperature: parseFloat(e.target.value) })
                    }
                    className="w-[180px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Top P</label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={config.top_p}
                    onChange={(e) =>
                      setConfig({ ...config, top_p: parseFloat(e.target.value) })
                    }
                    className="w-[180px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Presence Penalty</label>
                  <Input
                    type="number"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={config.presence_penalty}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        presence_penalty: parseFloat(e.target.value)
                      })
                    }
                    className="w-[180px]"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Frequency Penalty</label>
                  <Input
                    type="number"
                    min={-2}
                    max={2}
                    step={0.1}
                    value={config.frequency_penalty}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        frequency_penalty: parseFloat(e.target.value)
                      })
                    }
                    className="w-[180px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Test mode */}
        <div className="w-1/2 p-4">
          <ScrollArea className="h-[calc(100vh-140px)] rounded-md border p-4">
            {chatMessages.map((message, index) => (
              <Card key={index} className="mb-4 p-4">
                <div className="font-semibold mb-2">
                  {message.role === 'user' ? 'Вы' : message.role === 'assistant' ? 'Ассистент' : 'Система'}:
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </Card>
            ))}
          </ScrollArea>
          <div className="mt-4 flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Введите сообщение..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
