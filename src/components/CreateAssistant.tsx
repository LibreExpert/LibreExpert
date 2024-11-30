import { useState, useEffect } from 'react'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { ScrollArea } from "./ui/scroll-area"
import { Checkbox } from "./ui/checkbox"
import { Card } from "./ui/card"
import { Zap, Send } from 'lucide-react'
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

export default function CreateAssistant() {
  const [config, setConfig] = useState<AssistantConfig>({
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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [apiKey, setApiKey] = useState(() => {
    // Пытаемся получить ключ из localStorage при инициализации
    return localStorage.getItem('openai_api_key') || ''
  })
  const [aiService, setAiService] = useState<AIService | null>(null)
  const [experts, setExperts] = useState<AssistantConfig[]>([])
  const [isTestMode, setIsTestMode] = useState(true)

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
      const newExpertId = config.name.toLowerCase().replace(/\s+/g, '-')
      const newExpert = { ...config, id: newExpertId }
      
      if (experts.some(expert => expert.id === newExpertId)) {
        toast.error('Эксперт с таким названием уже существует')
        return
      }

      const updatedExperts = [...experts, newExpert]
      setExperts(updatedExperts)

      await fetch('/api/saveExperts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ experts: updatedExperts })
      })

      toast.success('Эксперт успешно создан')
      
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
      setChatMessages([])
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
    <div className="flex h-screen bg-background">
      <div className="w-1/2 border-r">
        <ScrollArea className="h-full px-6 py-4">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <div className="space-x-2">
                <Input 
                  placeholder="Введите API ключ OpenAI"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type="password"
                  className="w-64"
                />
                {!isTestMode && (
                  <Button 
                    onClick={handleSaveExpert}
                    disabled={!config.name}
                  >
                    Сохранить эксперта
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  {isTestMode ? 'Тестирование эксперта' : 'Создание нового эксперта'}
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setIsTestMode(!isTestMode)}
                >
                  {isTestMode ? 'Режим создания' : 'Режим тестирования'}
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Название эксперта
                </label>
                <Input
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  placeholder="Введите название"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Описание
                </label>
                <Textarea
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Введите описание"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
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
                <label className="text-sm font-medium mb-1 block">
                  Модель
                </label>
                <Input
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="Введите название модели"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Temperature
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Top P
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.top_p}
                    onChange={(e) => setConfig({ ...config, top_p: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Presence Penalty
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.presence_penalty}
                    onChange={(e) => setConfig({ ...config, presence_penalty: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Frequency Penalty
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.frequency_penalty}
                    onChange={(e) => setConfig({ ...config, frequency_penalty: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium block">
                  Возможности
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={config.capabilities.webBrowsing}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          capabilities: {
                            ...config.capabilities,
                            webBrowsing: checked as boolean
                          }
                        })
                      }
                    />
                    <label>Web Browsing</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={config.capabilities.imageGeneration}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          capabilities: {
                            ...config.capabilities,
                            imageGeneration: checked as boolean
                          }
                        })
                      }
                    />
                    <label>Image Generation</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={config.capabilities.codeInterpreter}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          capabilities: {
                            ...config.capabilities,
                            codeInterpreter: checked as boolean
                          }
                        })
                      }
                    />
                    <label>Code Interpreter</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="w-1/2 bg-zinc-900 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">
            Предварительный просмотр: {config.name || 'Новый эксперт'}
          </h2>
        </div>

        <Card className="flex-1 bg-zinc-800 border-zinc-700 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-zinc-700 text-zinc-100'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-zinc-700">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Введите сообщение..."
                className="flex-1 bg-zinc-700 border-zinc-600 text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage()
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!apiKey || !aiService}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
