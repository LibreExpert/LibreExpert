'use client'

import React, { useState, useEffect, useRef } from 'react';
import type { Expert } from '@/types/expert';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { useRouter } from 'next/navigation';
import { ExpertSelector } from '@/components/ExpertSelector';

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

export default function Chat() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [browserId, setBrowserId] = useState<string>(() => {
    let id = localStorage.getItem('browserId');
    if (!id) {
      id = window.crypto.randomUUID();
      localStorage.setItem('browserId', id);
    }
    return id;
  });
  const [error, setError] = useState<string | null>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showExpertSelector, setShowExpertSelector] = useState(false);

  // Constants
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  const handleExpertSelect = async (expert: Expert) => {
    try {
      // Сохраняем выбранного эксперта
      localStorage.setItem('selected_expert_id', expert.id);
      setSelectedExpert(expert);

      // Создаем новый чат с выбранным экспертом
      await createNewChat(expert);

      // Скрываем ExpertSelector
      setShowExpertSelector(false);
    } catch (error) {
      console.error('Error selecting expert:', error);
      setError('Failed to select expert');
    }
  };

  // Load experts from backend
  useEffect(() => {
    const loadExperts = async () => {
      try {
        const response = await fetch('/api/experts');
        if (!response.ok) throw new Error('Failed to fetch experts');
        const data = await response.json();

        setExperts(data);

        // Set selected expert from localStorage or first expert
        const savedExpertId = localStorage.getItem('selected_expert_id');
        const expert = savedExpertId
          ? data.find((e: Expert) => e.id === savedExpertId)
          : data[0];

        if (expert) {
          setSelectedExpert(expert);
        }
      } catch (error) {
        console.error('Error loading experts:', error);
        setError(error instanceof Error ? error.message : 'Failed to load experts');
      }
    };

    loadExperts();
  }, []);

  // Load chats from backend
  useEffect(() => {
    const loadChats = async () => {
      try {
        const response = await fetch(`/api/chats?browserId=${browserId}`);
        if (!response.ok) throw new Error('Failed to fetch chats');
        const data = await response.json();

        // Сортируем чаты по lastActivity в порядке убывания
        const sortedChats = data.sort(
          (a: Chat, b: Chat) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        );

        setChats(sortedChats);

        // Если есть сохраненный ID чата, выбираем его
        const savedChatId = localStorage.getItem('selected_chat_id');
        const savedChat = savedChatId
          ? sortedChats.find((chat: Chat) => chat.id === savedChatId)
          : sortedChats[0];

        if (savedChat) {
          setCurrentChat(savedChat);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chats');
      }
    };

    loadChats();
  }, [browserId]);

  // Check for inactivity
  useEffect(() => {
    const checkInactivity = async () => {
      if (currentChat && !currentChat.problemResolved) {
        const timeSinceLastActivity = Date.now() - new Date(currentChat.lastActivity).getTime();

        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
          const inactivityMessage: Message = {
            role: 'assistant',
            content:
              'Я заметил, что прошло некоторое время с нашего последнего взаимодействия. Удалось ли решить вашу проблему? Если нет, я готов продолжить помогать.',
            timestamp: Date.now(),
          };

          const updatedChat = {
            ...currentChat,
            messages: [...currentChat.messages, inactivityMessage],
          };

          setChats((prev) => {
            const newChats = prev.map((chat) => (chat.id === currentChat.id ? updatedChat : chat));
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
  const createNewChat = async (expert: Expert) => {
    if (!expert) {
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
      problemResolved: false,
    };

    try {
      // Save to backend first
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newChat),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat on backend');
      }

      const savedChat = await response.json();

      // Update local state only after successful backend save
      setChats((prev) => {
        const updatedChats = [...prev, savedChat].sort(
          (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
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
      setCurrentChat((prevChat) => ({
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

    setChats((prev) => {
      const updatedChats = prev.map((chat) =>
        chat.id === currentChat.id ? { ...chat, problemResolved: resolved } : chat
      );
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

  const handleNewChat = () => {
    // Отображаем компонент ExpertSelector
    setShowExpertSelector(true);
    // Очищаем текущий чат
    setCurrentChat(null);
  };

  return (
    <div className="flex h-screen bg-[#343541]">
      {/* Sidebar */}
      <div className="w-64 bg-[#202123] text-white p-2 flex flex-col">
        <button
          onClick={handleNewChat}
          className="w-full bg-transparent hover:bg-[#2A2B32] border border-[#565869] text-white rounded-lg px-4 py-2 mb-4 flex items-center gap-2"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 4L12 20M20 12L4 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Новый чат
        </button>
        <div className="flex-1 overflow-auto space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`p-3 cursor-pointer rounded-lg hover:bg-[#2A2B32] flex items-center gap-2 ${
                currentChat?.id === chat.id ? 'bg-[#2A2B32]' : ''
              }`}
              onClick={() => {
                setCurrentChat(chat);
                setShowExpertSelector(false);
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"
                  fill="currentColor"
                />
              </svg>
              <div className="flex-1 truncate text-sm">{chat.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-[#343541]">
        {showExpertSelector ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-4xl mx-auto px-4">
              <h1 className="text-2xl font-bold mb-8 text-center text-white">
                Выберите эксперта для нового чата
              </h1>
              <div className="mb-4">
                <ExpertSelector onSelect={handleExpertSelect} selectedExpertId={null} />
              </div>
            </div>
          </div>
        ) : selectedExpert && currentChat ? (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-3xl mx-auto">
                {currentChat.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`py-6 ${
                      msg.role === 'assistant' ? 'bg-[#444654]' : ''
                    } -mx-4 px-4`}
                  >
                    <div className="max-w-3xl mx-auto flex gap-4">
                      <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0">
                        {msg.role === 'assistant' ? (
                          <div className="bg-[#10a37f] rounded-sm w-full h-full flex items-center justify-center text-white">
                            AI
                          </div>
                        ) : (
                          <div className="bg-[#7C7C8A] rounded-sm w-full h-full flex items-center justify-center text-white">
                            U
                          </div>
                        )}
                      </div>
                      <div className="prose prose-invert flex-1">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            pre: ({ children, ...props }) => (
                              <div className="relative group">
                                <pre
                                  {...props}
                                  className="bg-[#1E1E1E] p-4 rounded-lg overflow-x-auto"
                                >
                                  {children}
                                </pre>
                                <button
                                  onClick={() => {
                                    const codeElement = React.Children.toArray(children).find(
                                      (child): child is React.ReactElement =>
                                        React.isValidElement(child) && child.type === 'code'
                                    );
                                    if (
                                      codeElement &&
                                      typeof codeElement.props.children === 'string'
                                    ) {
                                      navigator.clipboard.writeText(
                                        codeElement.props.children
                                      );
                                    }
                                  }}
                                  className="absolute top-2 right-2 bg-[#2A2B32] text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Copy
                                </button>
                              </div>
                            ),
                            code: ({ className, children, ...props }) => {
                              const match = /language-(\w+)/.exec(className || '');
                              return match ? (
                                <code {...props} className={className}>
                                  {children}
                                </code>
                              ) : (
                                <code
                                  {...props}
                                  className="bg-[#2A2B32] px-1 py-0.5 rounded"
                                >
                                  {children}
                                </code>
                              );
                            },
                            p: ({ children }) => (
                              <p className="text-white mb-4 last:mb-0">{children}</p>
                            ),
                            a: ({ children, href }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#10a37f] hover:underline"
                              >
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                {currentChat &&
                  !currentChat.problemResolved &&
                  currentChat.messages.some(
                    (msg) =>
                      msg.role === 'assistant' &&
                      msg.content.includes('Удалось ли решить вашу проблему?')
                  ) && (
                    <div className="mt-2 flex justify-center space-x-2">
                      <button
                        onClick={() => handleProblemResolution(true)}
                        className="px-3 py-1 bg-[#10a37f] text-white rounded hover:bg-[#0d926f] transition-colors"
                      >
                        Да, решено
                      </button>
                      <button
                        onClick={() => handleProblemResolution(false)}
                        className="px-3 py-1 bg-[#2A2B32] text-white rounded hover:bg-[#444654] transition-colors"
                      >
                        Нет, нужна помощь
                      </button>
                    </div>
                  )}
              </div>
            </ScrollArea>

            {/* Message input */}
            <div className="border-t border-[#2A2B32] p-4">
              <div className="max-w-3xl mx-auto relative">
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
                  className="w-full bg-[#40414F] text-white rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#10a37f] resize-none"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '200px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !message.trim()}
                  className="absolute right-2 bottom-1.5 p-2 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={message.trim() ? 'text-[#10a37f]' : 'text-gray-400'}
                  >
                    <path
                      d="M7 11L12 6M12 6L17 11M12 6V20"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      transform="rotate(90 12 12)"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white">
            Выберите чат или начните новый
          </div>
        )}
      </div>
    </div>
  );
}
