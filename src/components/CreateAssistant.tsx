import { useState, useEffect } from 'react'
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { ScrollArea } from "./ui/scroll-area"
import { Checkbox } from "./ui/checkbox"
import { Card } from "./ui/card"
import { Zap, Upload, X, Send } from 'lucide-react'
import { toast } from 'sonner'

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

  const [files, setFiles] = useState<File[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')

  useEffect(() => {
    // Load existing experts configuration
    fetch('/config/experts.json')
      .then(response => response.json())
      .then(data => {
        if (data.experts && data.experts.length > 0) {
          const expert = data.experts[0] // Load first expert as example
          setConfig(prev => ({
            ...prev,
            ...expert,
            capabilities: {
              ...prev.capabilities,
              // Add any capabilities from expert if they exist
              ...(expert.capabilities || {})
            }
          }))
        }
      })
      .catch(error => {
        console.error('Error loading experts config:', error)
      })
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const userMessage: ChatMessage = {
        role: 'user',
        content: inputMessage.trim()
      }
      setChatMessages([...chatMessages, userMessage])
      setInputMessage('')

      // Simulate assistant response
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: `This is a simulated response from ${config.name || 'the assistant'}.`
        }
        setChatMessages(prev => [...prev, assistantMessage])
      }, 1000)
    }
  }

  const handleSaveConfig = async () => {
    try {
      const response = await fetch('/api/saveConfig', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expert: config
        })
      })

      if (response.ok) {
        toast.success('Конфигурация сохранена')
      } else {
        toast.error('Ошибка при сохранении')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Ошибка при сохранении')
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Configuration Panel */}
      <div className="w-1/2 border-r">
        <ScrollArea className="h-full px-6 py-4">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <Button onClick={handleSaveConfig}>
                Сохранить конфигурацию
              </Button>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Конфигурация</h2>

              <div className="space-y-2">
                <label className="text-sm font-medium">Имя</label>
                <Input
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  placeholder="Название вашего GPT"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Описание</label>
                <Textarea
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Краткое описание возможностей вашего GPT"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Системный промпт</label>
                <Textarea
                  value={config.systemPrompt}
                  onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                  placeholder="Системный промпт для вашего GPT"
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Параметры модели</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Модель</label>
                    <Input
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      placeholder="Название модели"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Temperature</label>
                    <Input
                      type="number"
                      value={config.temperature}
                      onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                      placeholder="0 - 1"
                      min="0"
                      max="1"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Presence Penalty</label>
                    <Input
                      type="number"
                      value={config.presence_penalty}
                      onChange={(e) => setConfig({ ...config, presence_penalty: parseFloat(e.target.value) })}
                      placeholder="0 - 1"
                      min="0"
                      max="1"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Frequency Penalty</label>
                    <Input
                      type="number"
                      value={config.frequency_penalty}
                      onChange={(e) => setConfig({ ...config, frequency_penalty: parseFloat(e.target.value) })}
                      placeholder="0 - 1"
                      min="0"
                      max="1"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Top P</label>
                    <Input
                      type="number"
                      value={config.top_p}
                      onChange={(e) => setConfig({ ...config, top_p: parseFloat(e.target.value) })}
                      placeholder="0 - 1"
                      min="0"
                      max="1"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Знания</label>
                <p className="text-sm text-muted-foreground">
                  Если вы загружаете файлы в разделе «Знания», обсуждения с вашим GPT могут включать в себя содержимое файлов.
                </p>
                <div className="border rounded-lg p-4 space-y-4">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-center">
                    <label className="cursor-pointer">
                      <Input
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        multiple
                      />
                      <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <Upload className="h-4 w-4" />
                        <span>Загрузить файлы</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Возможности</label>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="webBrowsing"
                      checked={config.capabilities.webBrowsing}
                      onCheckedChange={(checked: boolean) =>
                        setConfig({
                          ...config,
                          capabilities: { ...config.capabilities, webBrowsing: checked }
                        })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="webBrowsing"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Поиск в сети
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="imageGeneration"
                      checked={config.capabilities.imageGeneration}
                      onCheckedChange={(checked: boolean) =>
                        setConfig({
                          ...config,
                          capabilities: { ...config.capabilities, imageGeneration: checked }
                        })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="imageGeneration"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Генерация изображений DALL-E
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="codeInterpreter"
                      checked={config.capabilities.codeInterpreter}
                      onCheckedChange={(checked: boolean) =>
                        setConfig({
                          ...config,
                          capabilities: { ...config.capabilities, codeInterpreter: checked }
                        })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="codeInterpreter"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Интерпретатор кода и анализ данных
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Preview Panel with Chat Interface */}
      <div className="w-1/2 bg-zinc-900 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Предварительный просмотр</h2>
        </div>
        <div className="flex-1 p-4 flex flex-col">
          <Card className="flex-1 bg-zinc-800 border-zinc-700 flex flex-col">
            <div className="p-4 border-b border-zinc-700 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  {config.name || 'Название GPT'}
                </h3>
                <p className="text-sm text-zinc-400">
                  {config.description || 'Описание вашего GPT'}
                </p>
              </div>
            </div>
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
                <Button onClick={handleSendMessage} size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
