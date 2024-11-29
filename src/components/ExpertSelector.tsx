import { ScrollArea } from "@/components/ui/scroll-area"
import experts from '@/config/experts.json'

interface ExpertSelectorProps {
  onSelect: (expert: typeof experts.experts[0]) => void
  selectedExpertId: string | null
}

export function ExpertSelector({ onSelect, selectedExpertId }: ExpertSelectorProps) {
  return (
    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
      <div className="space-y-4">
        {experts.experts.map((expert) => (
          <div
            key={expert.id}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              selectedExpertId === expert.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
            onClick={() => onSelect(expert)}
          >
            <h3 className="font-semibold">{expert.name}</h3>
            <p className="text-sm mt-1 opacity-90">{expert.description}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
