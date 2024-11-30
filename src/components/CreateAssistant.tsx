import { useState, useEffect } from 'react'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { ScrollArea } from "./ui/scroll-area"
import { Card } from "./ui/card"
import { Send, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { AIService } from '@/services/ai.service'

interface AssistantConfig {
  id: string;
  model: string;
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
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  initialConfig?: AssistantConfig;
  onSave?: () => void;
}

export default function CreateAssistant({ initialConfig, onSave }: Props) {
  const [config, setConfig] = useState<AssistantConfig>(() => {
    if (initialConfig) {
      return initialConfig;
    }
    return {
      id: '',
      model: 'gpt-4o-mini',
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
    };
  })

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [apiKey, setApiKey] = useState(() => {
    // Пытаемся получить ключ из localStorage при инициализации
    return localStorage.getItem('openai_api_key') || ''
  })
  const [aiService, setAiService] = useState<AIService | null>(null)
  const [experts, setExperts] = useState<AssistantConfig[]>([])
  const [isTestMode] = useState(true)

  useEffect(() => {
    const loadExperts = async () => {
      try {
        const response = await fetch('/config/experts.json')
        const data = await response.json()
        setExperts(data.experts || [])
      } catch (error) {
        console.error('Error loading experts:', error)
        toast.error('Не удалось загрузить экспертов')
      }
    }
    loadExperts()
  }, [])

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey)
    }
  }, [apiKey])

  useEffect(() => {
    if (apiKey && config) {
      const service = new AIService(
        apiKey,
        config.model,
        config.temperature,
        config.presence_penalty,
        config.frequency_penalty,
        config.top_p
      )
      setAiService(service)
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

      await fetch('/api/saveExperts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ experts: updatedExperts })
      })

      toast.success(initialConfig ? 'Эксперт успешно обновлен' : 'Эксперт успешно создан')
      
      if (!initialConfig) {
        setConfig({
          id: '',
          model: 'gpt-4o-mini',
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !aiService) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim()
    }
    
    setChatMessages(prev => [...prev, userMessage])
    setInputMessage('')

    try {
      const systemPrompt = config.systemPrompt || 'You are a helpful AI assistant.'
      const response = await aiService.generateResponse(systemPrompt, [...chatMessages, userMessage])

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
          <h1 className="text-lg font-semibold">
            {isTestMode ? 'Тестирование эксперта' : initialConfig ? 'Редактирование эксперта' : 'Создание нового эксперта'}
          </h1>
        </div>
        {!isTestMode && (
          <Button
            onClick={handleSaveExpert}
            disabled={!config.name}
          >
            {initialConfig ? 'Обновить эксперта' : 'Сохранить эксперта'}
          </Button>
        )}
      </header>

      <div className="flex gap-4 h-[calc(100vh-64px)]">
        {/* Left side - Creation mode */}
        <div className="w-1/2 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
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

            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Модель</label>
                  <Input
                    value={config.model}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    className="w-[180px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
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
        </div>

        {/* Right side - Test mode */}
        <div className="w-1/2 p-4">
          <ScrollArea className="h-[calc(100vh-140px)] rounded-md border p-4">
            {chatMessages.map((message, index) => (
              <Card key={index} className="mb-4 p-4">
                <div className="font-semibold mb-2">
                  {message.role === 'user' ? 'Вы' : 'Ассистент'}:
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
