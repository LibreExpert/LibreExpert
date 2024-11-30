import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

interface ChatHistoryProps {
  onSelectChat: (chat: any) => void;
}

export function ChatHistory({ onSelectChat }: ChatHistoryProps) {
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    const loadChats = async () => {
      try {
        const response = await fetch('/api/chats');
        if (!response.ok) {
          throw new Error('Failed to fetch chats');
        }
        const data = await response.json();
        setChats(data);
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    };

    loadChats();
  }, []);

  return (
    <Card className="w-full h-full p-4">
      <h2 className="text-xl font-bold mb-4">Chat History</h2>
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-2">
          {chats.map((chat) => (
            <Card
              key={chat.id}
              className="p-4 cursor-pointer hover:bg-gray-100"
              onClick={() => onSelectChat(chat)}
            >
              <h3 className="font-semibold">{chat.title}</h3>
              <p className="text-sm text-gray-500">
                {new Date(chat.lastActivity).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
