import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import CreateAssistant from './CreateAssistant'
import { Pencil, Trash2, Plus } from 'lucide-react'
import defaultExperts from '@/config/experts.json'

interface RawAssistantConfig {
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
  const [experts, setExperts] = useState<AssistantConfig[]>(() => {
    try {
      // Пытаемся получить экспертов из localStorage
      const stored = localStorage.getItem('experts')
      if (stored) {
        const parsedExperts = JSON.parse(stored) as RawAssistantConfig[]
        // Добавляем capabilities если их нет
        return parsedExperts.map((expert) => ({
          ...expert,
          capabilities: expert.capabilities || {
            webBrowsing: false,
            imageGeneration: false,
            codeInterpreter: false
          }
        }))
      }
      // Если в localStorage ничего нет, используем данные из файла
      const defaultExpertsWithCapabilities = (defaultExperts.experts as RawAssistantConfig[]).map(expert => ({
        ...expert,
        capabilities: {
          webBrowsing: false,
          imageGeneration: false,
          codeInterpreter: false
        }
      }))
      localStorage.setItem('experts', JSON.stringify(defaultExpertsWithCapabilities))
      return defaultExpertsWithCapabilities
    } catch (error) {
      console.error('Error loading experts:', error)
      toast.error('Ошибка при загрузке экспертов')
      return []
    }
  })
  const [selectedExpert, setSelectedExpert] = useState<AssistantConfig | undefined>(undefined)
  const [isCreateMode, setIsCreateMode] = useState(false)

  // Сохраняем изменения в localStorage при каждом обновлении экспертов
  useEffect(() => {
    localStorage.setItem('experts', JSON.stringify(experts))
  }, [experts])

  const handleDeleteExpert = (expertId: string) => {
    const updatedExperts = experts.filter(expert => expert.id !== expertId)
    setExperts(updatedExperts)
    toast.success('Эксперт успешно удален')
  }

  const handleEditExpert = (expert: AssistantConfig) => {
    setSelectedExpert(expert)
    setIsCreateMode(true)
  }

  const handleCreateNewExpert = () => {
    setSelectedExpert(undefined)
    setIsCreateMode(true)
  }

  const handleSaveComplete = () => {
    setIsCreateMode(false)
    setSelectedExpert(undefined)
    // Обновляем список экспертов из localStorage
    const stored = localStorage.getItem('experts')
    if (stored) {
      setExperts(JSON.parse(stored))
    }
  }

  if (isCreateMode) {
    return (
      <CreateAssistant
        initialConfig={selectedExpert}
        onSave={handleSaveComplete}
      />
    )
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
                  {expert.capabilities?.webBrowsing && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Web</span>
                  )}
                  {expert.capabilities?.imageGeneration && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Image</span>
                  )}
                  {expert.capabilities?.codeInterpreter && (
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
    </div>
  )
}
