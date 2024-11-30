import { useState, useEffect } from 'react'
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { ScrollArea } from "./ui/scroll-area"
import { toast } from 'sonner'
import CreateAssistant from './CreateAssistant'
import { Pencil, Trash2, Plus } from 'lucide-react'

interface RawExpertData {
  id: string;
  model: string;
  temperature: number;
  presence_penalty: number;
  frequency_penalty: number;
  top_p: number;
  name: string;
  description: string;
  systemPrompt: string;
  capabilities?: {
    webBrowsing: boolean;
    imageGeneration: boolean;
    codeInterpreter: boolean;
  };
}

interface ExpertsResponse {
  experts: RawExpertData[];
}

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

export default function ExpertManager() {
  const [experts, setExperts] = useState<AssistantConfig[]>([])
  const [selectedExpert, setSelectedExpert] = useState<AssistantConfig | undefined>(undefined)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadExperts()
  }, [])

  const loadExperts = async () => {
    try {
      // First try to load from the API
      let response = await fetch('/api/experts')
      
      if (!response.ok) {
        // If API fails, try to load from the static file
        response = await fetch('/LibreExpert/config/experts.json')
      }
      
      if (!response.ok) {
        throw new Error('Failed to load experts')
      }
      
      const data = await response.json() as ExpertsResponse
      // Add default capabilities if missing
      const expertsWithCapabilities = (data.experts || []).map((expert: RawExpertData) => ({
        ...expert,
        capabilities: expert.capabilities || {
          webBrowsing: false,
          imageGeneration: false,
          codeInterpreter: false
        }
      }))
      setExperts(expertsWithCapabilities)
    } catch (error) {
      console.error('Error loading experts:', error)
      toast.error('Не удалось загрузить экспертов')
      
      // Try to load local file as fallback
      try {
        const data = await import('@/config/experts.json') as { default: ExpertsResponse }
        const expertsWithCapabilities = (data.default.experts || []).map((expert: RawExpertData) => ({
          ...expert,
          capabilities: expert.capabilities || {
            webBrowsing: false,
            imageGeneration: false,
            codeInterpreter: false
          }
        }))
        setExperts(expertsWithCapabilities)
      } catch (localError) {
        console.error('Error loading local experts:', localError)
      }
    }
  }

  const handleDeleteExpert = async (expertId: string) => {
    try {
      const updatedExperts = experts.filter(expert => expert.id !== expertId)
      await fetch('/api/saveExperts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ experts: updatedExperts })
      })
      setExperts(updatedExperts)
      toast.success('Эксперт успешно удален')
    } catch (error) {
      console.error('Error deleting expert:', error)
      toast.error('Ошибка при удалении эксперта')
    }
  }

  const handleEditExpert = (expert: AssistantConfig) => {
    setSelectedExpert(expert)
    setIsCreating(true)
  }

  if (isCreating) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => {
            setIsCreating(false)
            setSelectedExpert(undefined)
          }}
        >
          Назад к списку экспертов
        </Button>
        <CreateAssistant 
          initialConfig={selectedExpert}
          onSave={() => {
            setIsCreating(false)
            setSelectedExpert(undefined)
            loadExperts()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Управление экспертами</h2>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Создать нового эксперта
        </Button>
      </div>
      
      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {experts.map((expert) => (
            <Card key={expert.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{expert.name}</h3>
                  <p className="text-sm text-muted-foreground">{expert.description}</p>
                  <div className="mt-2 flex gap-2">
                    {expert.capabilities.webBrowsing && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Web</span>
                    )}
                    {expert.capabilities.imageGeneration && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Image</span>
                    )}
                    {expert.capabilities.codeInterpreter && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Code</span>
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
      </ScrollArea>
    </div>
  )
}
