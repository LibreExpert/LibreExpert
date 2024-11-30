import { useState, useEffect, useRef } from 'react';
import { Expert } from '../types/Expert';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import defaultExperts from '../config/experts.json';
import { AIService } from '../services/ai.service';
import { ExpertSelector } from './ExpertSelector';

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
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiServiceRef = useRef<AIService | null>(null);

  // Constants
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Load experts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('experts');
      if (stored) {
        const experts = JSON.parse(stored);
        // Устанавливаем первого эксперта по умолчанию если нет сохраненного
        const savedExpertId = localStorage.getItem('selected_expert_id');
        const expert = savedExpertId 
          ? experts.find((e: Expert) => e.id === savedExpertId)
          : experts[0];
          
        if (expert) {
          setSelectedExpert(expert);
        }
      } else {
        // Если в localStorage ничего нет, используем данные из файла
        const defaultExpertsWithCapabilities = defaultExperts.experts.map(expert => ({
          ...expert,
          capabilities: {
            webBrowsing: false,
            imageGeneration: false,
            codeInterpreter: false
          }
        }));
        setSelectedExpert(defaultExpertsWithCapabilities[0]);
      }
    } catch (error) {
      console.error('Error loading experts:', error);
      setSelectedExpert(defaultExperts.experts[0]);
    }
  }, []);

  // Load chats and API key from localStorage on component mount
  useEffect(() => {
    const savedChats = localStorage.getItem('chats');
    const savedApiKey = localStorage.getItem('openai_api_key');
    
    if (savedChats) {
      setChats(JSON.parse(savedChats));
    }
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Initialize AI service when API key or expert changes
  useEffect(() => {
    if (apiKey && selectedExpert) {
      aiServiceRef.current = new AIService(
        apiKey,
        selectedExpert.model,
        selectedExpert.temperature,
        selectedExpert.presence_penalty,
        selectedExpert.frequency_penalty,
        selectedExpert.top_p
      );
    }
  }, [apiKey, selectedExpert]);

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
  }, [currentChat, INACTIVITY_TIMEOUT]);

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
    if (!message.trim() || !apiKey || !selectedExpert || !aiServiceRef.current) return;

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

      // Generate response using LangChain
      const responseContent = await aiServiceRef.current.generateResponse(
        selectedExpert.systemPrompt,
        updatedChat.messages
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: responseContent,
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
      {/* Left sidebar */}
      <div className="w-64 border-r bg-gray-50 p-4 flex flex-col">
        <div className="mb-4">
          <ExpertSelector
            selectedExpertId={selectedExpert?.id || null}
            onSelect={(expert) => {
              setSelectedExpert(expert);
              localStorage.setItem('selected_expert_id', expert.id);
              setCurrentChat(null);
            }}
          />
        </div>
        <button
          onClick={createNewChat}
          className="w-full bg-blue-500 text-white rounded-lg px-4 py-2 mb-4 hover:bg-blue-600"
        >
          Новый чат
        </button>
        <div className="flex-1 overflow-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`p-2 cursor-pointer hover:bg-gray-100 ${
                currentChat?.id === chat.id ? 'bg-blue-100' : ''
              }`}
              onClick={() => setCurrentChat(chat)}
            >
              <div className="font-medium truncate">{chat.title}</div>
              <div className="text-sm text-gray-500">
                {new Date(chat.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {selectedExpert && (
          <>
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold">{selectedExpert.name}</h2>
              <p className="text-sm text-gray-600">{selectedExpert.description}</p>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {currentChat?.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div
                      className={`p-4 rounded-lg relative max-w-[80%] ${
                        msg.role === 'user'
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      <div className="mb-1">{msg.content}</div>
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {msg.timestamp 
                          ? new Date(msg.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })
                          : ''}
                      </div>
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
                  </div>
                ))}
              </div>
            </ScrollArea>
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
          </>
        )}
      </div>
    </div>
  );
}
