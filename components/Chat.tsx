'use client'

import React, { useState, useEffect, useRef } from 'react';
import type { Expert } from '@/types/expert';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

interface Chat {
  id: string;
  expertId: string;
  browserId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  problemResolved: boolean;
}

interface ExpertWithCapabilities extends Expert {
  capabilities: {
    webBrowsing: boolean;
    imageGeneration: boolean;
    codeInterpreter: boolean;
  };
}

export default function Chat() {
  const router = useRouter()
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [selectedExpert, setSelectedExpert] = useState<ExpertWithCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [browserId, setBrowserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [experts, setExperts] = useState<ExpertWithCapabilities[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  // Initialize browserId
  useEffect(() => {
    let id = localStorage.getItem('browserId');
    if (!id) {
      id = window.crypto.randomUUID();
      localStorage.setItem('browserId', id);
    }
    setBrowserId(id);
  }, []);

  // Load experts from backend
  useEffect(() => {
    const loadExperts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/experts');
        if (!response.ok) throw new Error('Failed to fetch experts');
        const data = await response.json();
        
        const expertsWithCapabilities: ExpertWithCapabilities[] = data.map((expert: Expert) => ({
          ...expert,
          capabilities: {
            webBrowsing: false,
            imageGeneration: false,
            codeInterpreter: false
          }
        }));
        
        setExperts(expertsWithCapabilities);

        // Set selected expert from localStorage or first expert
        const savedExpertId = localStorage.getItem('selected_expert_id');
        const expert = savedExpertId 
          ? expertsWithCapabilities.find(e => e.id === savedExpertId)
          : expertsWithCapabilities[0];
          
        if (expert && browserId) {
          setSelectedExpert(expert);
          // Создаем новый чат для выбранного эксперта, если нет текущего чата
          if (!currentChat) {
            createNewChat(expert);
          }
        }
      } catch (error) {
        console.error('Error loading experts:', error);
        setError(error instanceof Error ? error.message : 'Failed to load experts');
      } finally {
        setLoading(false);
      }
    };

    if (browserId) {
      loadExperts();
    }
  }, [browserId, currentChat]);

  // Load chats from backend
  useEffect(() => {
    const loadChats = async () => {
      if (!browserId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/chats?browserId=${browserId}`);
        if (!response.ok) throw new Error('Failed to fetch chats');
        const data = await response.json();
        
        // Сортируем чаты по lastActivity в порядке убывания
        const sortedChats = data.sort((a: Chat, b: Chat) => 
          new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        );
        
        setChats(sortedChats);
        
        // Если есть сохраненный ID чата, выбираем его
        const savedChatId = localStorage.getItem('selected_chat_id');
        if (savedChatId) {
          const savedChat = sortedChats.find((chat: Chat) => chat.id === savedChatId);
          if (savedChat) {
            setCurrentChat(savedChat);
          }
        }
      } catch (error) {
        console.error('Error loading chats:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chats');
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [browserId]);

  // Load saved API keys on mount
  useEffect(() => {
    const savedOpenAIKey = localStorage.getItem('openai_api_key');
    const savedGeminiKey = localStorage.getItem('gemini_api_key');

    if (selectedExpert) {
      const key = selectedExpert.provider === 'openai' ? savedOpenAIKey : savedGeminiKey;
      if (key) {
        // setApiKey(key);
      }
    }
  }, [selectedExpert?.provider]);

  // Check for inactivity
  useEffect(() => {
    const checkInactivity = async () => {
      if (currentChat && !currentChat.problemResolved) {
        const timeSinceLastActivity = Date.now() - currentChat.lastActivity.getTime();
        
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

  // Format chat title
  const formatChatTitle = (content: string) => {
    return content.length > 50 ? content.slice(0, 50) + '...' : content;
  };

  // Create new chat
  const createNewChat = async (expert: ExpertWithCapabilities) => {
    
    
    

    if (!expert || !browserId) {
      
      return;
    }

    const newChat: Chat = {
      id: window.crypto.randomUUID(),
      expertId: expert.id,
      browserId: browserId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      title: `Чат с ${expert.name} ${new Date().toLocaleString()}`,
      lastActivity: new Date(),
      problemResolved: false
    };

    

    try {
      // Save to backend first
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newChat.id,
          expertId: newChat.expertId,
          browserId: newChat.browserId,
          title: newChat.title,
          messages: newChat.messages
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat on backend');
      }

      const savedChat = await response.json();
      

      // Update local state only after successful backend save
      setChats(prev => {
        const updatedChats = [...prev, savedChat].sort((a, b) => 
          new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        );
        return updatedChats;
      });
      setCurrentChat(savedChat);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to create chat');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !currentChat || !selectedExpert) return;

    try {
      setIsLoading(true);

      const newMessage: Message = {
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };

      // Add message to UI immediately
      setCurrentChat(prevChat => ({
        ...prevChat!,
        messages: [...prevChat!.messages, newMessage],
      }));

      // Send message to API
      const response = await fetch(`/api/chats/${currentChat.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          expertId: selectedExpert.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Clear input
      setMessage('');

      // Scroll to bottom
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle problem resolution response
  const handleProblemResolution = async (resolved: boolean) => {
    if (!currentChat) return;
    
    setChats(prev => {
      const updatedChats = prev.map(chat => 
        chat.id === currentChat.id 
          ? { ...chat, problemResolved: resolved }
          : chat
      );
      localStorage.setItem('chats', JSON.stringify(updatedChats));
      return updatedChats;
    });
  };

  // Auto-adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Expert selector component
  const ExpertSelector = ({ experts, onSelect }: { 
    experts: ExpertWithCapabilities[], 
    onSelect: (expert: ExpertWithCapabilities) => void 
  }) => {
    return (
      <div className="flex flex-wrap gap-4 p-4">
        {experts.map((expert) => (
          <button
            key={expert.id}
            onClick={() => onSelect(expert)}
            className={`flex-1 min-w-[200px] p-4 rounded-lg border-2 transition-all ${
              selectedExpert?.id === expert.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <h3 className="font-medium text-lg mb-2">{expert.name}</h3>
            <p className="text-gray-600 text-sm">{expert.description}</p>
            <div className="mt-2 flex gap-2">
              {expert.capabilities.webBrowsing && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Веб-поиск
                </span>
              )}
              {expert.capabilities.imageGeneration && (
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                  Генерация изображений
                </span>
              )}
              {expert.capabilities.codeInterpreter && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  Интерпретатор кода
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  };

  const handleNewChat = () => {
    router.push('/new-chat')
  }

  return (
    <div className="flex h-screen">
      {/* Left sidebar */}
      <div className="w-64 border-r bg-gray-50 p-4 flex flex-col">
        <button
          onClick={handleNewChat}
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
                {chat.createdAt.toLocaleString()}
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
                {currentChat?.messages?.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    <div
                      className={`p-4 rounded-lg relative ${
                        msg.role === 'user'
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        className="prose prose-sm max-w-none dark:prose-invert"
                        components={{
                          pre: ({ children, ...props }) => {
                            const codeElement = React.Children.toArray(children).find(
                              (child): child is React.ReactElement => 
                                React.isValidElement(child) && child.type === 'code'
                            );
                             
                            return (
                              <div className="relative group">
                                <pre {...props} className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
                                  {children}
                                </pre>
                                <button
                                  onClick={() => {
                                    if (codeElement && typeof codeElement.props.children === 'string') {
                                      navigator.clipboard.writeText(codeElement.props.children);
                                    }
                                  }}
                                  className="absolute top-2 right-2 bg-gray-700 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Copy
                                </button>
                              </div>
                            );
                          },
                          code: ({ className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            return match ? (
                              <code {...props} className={className}>
                                {children}
                              </code>
                            ) : (
                              <code {...props} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                                {children}
                              </code>
                            );
                          },
                          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                          a: ({ children, href }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      {msg.timestamp && (
                        <div className={`text-[10px] text-gray-400 mt-1 leading-none ${msg.role === 'assistant' ? 'text-right' : ''}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {currentChat?.messages?.map((msg, index) => (
                  msg.role === 'assistant' && 
                  msg.content.includes('Удалось ли решить вашу проблему?') && 
                  !currentChat.problemResolved && (
                    <div key={index} className="mt-2 flex space-x-2">
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
                  )
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
                      handleSendMessage();
                    }
                  }}
                  placeholder="Введите сообщение..."
                  className="flex-1 resize-none border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={1}
                  style={{ height: '40px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !message.trim()}
                  className={`${
                    isLoading || !message.trim() 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  } text-white rounded-lg px-6 py-2`}
                >
                  {isLoading ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </div>
          </> 
        )}
      </div>
    </div>
  );
}
