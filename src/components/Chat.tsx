import { useState, useEffect, useRef } from 'react';
import { Expert } from '../types/Expert';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import experts from '../config/experts.json';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface Chat {
  id: string;
  expertId: string;
  messages: Message[];
  createdAt: string;
  title: string;
  lastActivity: number;
  problemResolved?: boolean;
}

export default function Chat() {
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedExpert, setSelectedExpert] = useState<Expert>(experts.experts[0]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Load chats and API key from localStorage on component mount
  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    const savedApiKey = localStorage.getItem('openai_api_key');
    const savedExpertId = localStorage.getItem('selected_expert_id');
    
    if (savedChats) {
      setChats(JSON.parse(savedChats));
    }
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    if (savedExpertId) {
      const expert = experts.experts.find(e => e.id === savedExpertId);
      if (expert) {
        setSelectedExpert(expert);
      }
    }
  }, []);

  // Check for inactivity
  useEffect(() => {
    const checkInactivity = async () => {
      if (currentChat && !currentChat.problemResolved) {
        const timeSinceLastActivity = Date.now() - currentChat.lastActivity;
        
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
          const inactivityMessage: Message = {
            role: 'assistant',
            content: 'Я заметил, что прошло некоторое время с нашего последнего взаимодействия. Удалось ли решить вашу проблему? Если нет, я готов продолжить помогать.',
            timestamp: Date.now()
          };

          const updatedChat = {
            ...currentChat,
            messages: [...currentChat.messages, inactivityMessage]
          };

          setChats(prev => {
            const newChats = prev.map(chat => 
              chat.id === currentChat.id ? updatedChat : chat
            );
            localStorage.setItem('chats', JSON.stringify(newChats));
            return newChats;
          });
          setCurrentChat(updatedChat);
        }
      }
    };

    // Clear existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // Set new timeout
    if (currentChat && !currentChat.problemResolved) {
      inactivityTimeoutRef.current = setTimeout(checkInactivity, INACTIVITY_TIMEOUT);
    }

    // Cleanup
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [currentChat]);

  // Create new chat
  const createNewChat = () => {
    if (!selectedExpert) return;
    
    const newChat: Chat = {
      id: Date.now().toString(),
      expertId: selectedExpert.id,
      messages: [],
      createdAt: new Date().toISOString(),
      title: `Чат с ${selectedExpert.name} ${new Date().toLocaleString()}`,
      lastActivity: Date.now(),
      problemResolved: false
    };
    setChats(prev => {
      const updatedChats = [newChat, ...prev];
      localStorage.setItem('chats', JSON.stringify(updatedChats));
      return updatedChats;
    });
    setCurrentChat(newChat);
  };

  // Handle expert selection
  const handleExpertSelect = (expertId: string) => {
    const expert = experts.experts.find(e => e.id === expertId);
    if (expert) {
      setSelectedExpert(expert);
      localStorage.setItem('selected_expert_id', expert.id);
      setCurrentChat(null);
    }
  };

  // Handle problem resolution response
  const handleProblemResolution = async (resolved: boolean) => {
    if (!currentChat) return;

    const resolutionMessage: Message = {
      role: 'user',
      content: resolved ? 'Да, моя проблема решена. Спасибо!' : 'Нет, мне всё ещё нужна помощь.',
      timestamp: Date.now()
    };

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, resolutionMessage],
      lastActivity: Date.now(),
      problemResolved: resolved
    };

    setChats(prev => {
      const newChats = prev.map(chat => 
        chat.id === currentChat.id ? updatedChat : chat
      );
      localStorage.setItem('chats', JSON.stringify(newChats));
      return newChats;
    });
    setCurrentChat(updatedChat);

    if (!resolved) {
      // Send follow-up message
      const followUpMessage: Message = {
        role: 'assistant',
        content: 'Понятно. Давайте продолжим работу над вашей проблемой. Что именно осталось нерешённым?',
        timestamp: Date.now()
      };

      const chatWithFollowUp = {
        ...updatedChat,
        messages: [...updatedChat.messages, followUpMessage]
      };

      setChats(prev => {
        const newChats = prev.map(chat => 
          chat.id === currentChat.id ? chatWithFollowUp : chat
        );
        localStorage.setItem('chats', JSON.stringify(newChats));
        return newChats;
      });
      setCurrentChat(chatWithFollowUp);
    }
  };

  // Auto-adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Send message
  const sendMessage = async () => {
    if (!message.trim() || !apiKey || !selectedExpert) return;

    const updatedChat: Chat = currentChat ? {
      ...currentChat,
      lastActivity: Date.now()
    } : {
      id: Date.now().toString(),
      expertId: selectedExpert.id,
      messages: [],
      createdAt: new Date().toISOString(),
      title: `Чат с ${selectedExpert.name} ${new Date().toLocaleString()}`,
      lastActivity: Date.now(),
      problemResolved: false
    };

    const newMessage: Message = { 
      role: 'user', 
      content: message,
      timestamp: Date.now()
    };
    updatedChat.messages = [...updatedChat.messages, newMessage];

    try {
      // Update chat state
      if (!currentChat) {
        setChats(prev => {
          const newChats = [updatedChat, ...prev];
          localStorage.setItem('chats', JSON.stringify(newChats));
          return newChats;
        });
        setCurrentChat(updatedChat);
      } else {
        setChats(prev => {
          const newChats = prev.map(chat => 
            chat.id === currentChat.id ? updatedChat : chat
          );
          localStorage.setItem('chats', JSON.stringify(newChats));
          return newChats;
        });
        setCurrentChat(updatedChat);
      }

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-1106-preview',
          messages: [
            { role: 'system', content: selectedExpert.systemPrompt },
            ...updatedChat.messages
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.choices[0].message.content,
        timestamp: Date.now()
      };

      // Update chat with AI response
      const chatWithResponse = {
        ...updatedChat,
        messages: [...updatedChat.messages, assistantMessage],
        lastActivity: Date.now()
      };

      setChats(prev => {
        const newChats = prev.map(chat => 
          chat.id === chatWithResponse.id ? chatWithResponse : chat
        );
        localStorage.setItem('chats', JSON.stringify(newChats));
        return newChats;
      });
      setCurrentChat(chatWithResponse);

    } catch (error) {
      console.error('Error:', error);
    }

    setMessage('');
  };

  // Render API key input if not set
  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-96 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">Введите API ключ OpenAI</h2>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              localStorage.setItem('openai_api_key', e.target.value);
            }}
            placeholder="sk-..."
            className="w-full p-2 border rounded mb-4"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 border-r border-gray-200 p-4">
        {/* Expert Selector */}
        <div className="mb-4">
          <select
            value={selectedExpert.id}
            onChange={(e) => handleExpertSelect(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {experts.experts.map(expert => (
              <option key={expert.id} value={expert.id}>
                {expert.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={createNewChat}
          className="w-full bg-blue-500 text-white rounded-lg px-4 py-2 mb-4 hover:bg-blue-600"
        >
          Новый чат
        </button>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2">
            {chats
              .filter(chat => chat.expertId === selectedExpert.id)
              .map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setCurrentChat(chat)}
                  className={`p-2 rounded-lg cursor-pointer ${
                    currentChat?.id === chat.id ? 'bg-blue-100' : 'hover:bg-gray-200'
                  }`}
                >
                  <div className="text-sm font-medium truncate">{chat.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </div>
                  {chat.problemResolved && (
                    <div className="text-xs text-green-500">Решено ✓</div>
                  )}
                </div>
              ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {currentChat?.messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start space-x-2 ${
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`p-4 rounded-lg relative ${
                    msg.role === 'user'
                      ? 'bg-blue-100 ml-auto max-w-[80%]'
                      : 'bg-gray-100 mr-auto max-w-[80%]'
                  }`}
                >
                  {msg.content}
                  {msg.role === 'assistant' && 
                   msg.content.includes('Удалось ли решить вашу проблему?') && 
                   !currentChat.problemResolved && (
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={() => handleProblemResolution(true)}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Да, решено
                      </button>
                      <button
                        onClick={() => handleProblemResolution(false)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Нет, нужна помощь
                      </button>
                    </div>
                  )}
                </div>
                <div className={`text-xs text-gray-500 self-end mb-2 ${
                  msg.role === 'user' ? 'text-right' : 'text-left'
                }`}>
                  {msg.timestamp 
                    ? new Date(msg.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : ''}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-4">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Введите сообщение..."
              className="flex-1 resize-none border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
            />
            <button
              onClick={sendMessage}
              className="bg-blue-500 text-white rounded-lg px-6 py-2 hover:bg-blue-600"
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
