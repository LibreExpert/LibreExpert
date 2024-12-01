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

// Функция для генерации UUID v4
function generateUUID() {
  let d = new Date().getTime();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export default function Chat() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [browserId, setBrowserId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 минут в миллисекундах

  // Инициализация browserId
  useEffect(() => {
    let id = localStorage.getItem('browserId');
    if (!id) {
      id = generateUUID();
      localStorage.setItem('browserId', id);
    }
    setBrowserId(id);
  }, []);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleExpertSelect = async (expert: Expert) => {
    try {
      // Сохраняем выбранного эксперта
      localStorage.setItem('selected_expert_id', expert.id);
      setSelectedExpert(expert);

      // Создаем новый чат с выбранным экспертом
      await createNewChat(expert);
    } catch (error) {
      console.error('Error selecting expert:', error);
      setError('Не удалось выбрать эксперта');
    }
  };

  // Загрузка экспертов с бэкенда
  useEffect(() => {
    const loadExperts = async () => {
      try {
        const response = await fetch('/api/experts');
        if (!response.ok) throw new Error('Не удалось получить список экспертов');
        const data = await response.json();

        setExperts(data);
      } catch (error) {
        console.error('Error loading experts:', error);
        setError(error instanceof Error ? error.message : 'Не удалось загрузить экспертов');
      }
    };

    loadExperts();
  }, []);

  // Загрузка чатов с бэкенда
  useEffect(() => {
    const loadChats = async () => {
      try {
        const response = await fetch(`/api/chats?browserId=${browserId}`);
        if (!response.ok) throw new Error('Не удалось получить список чатов');
        const data = await response.json();

        // Сортируем чаты по дате последней активности в порядке убывания
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
        setError(error instanceof Error ? error.message : 'Не удалось загрузить чаты');
      }
    };

    loadChats();
  }, [browserId]);

  // Проверка на бездействие
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

    // Очистка предыдущего таймера
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // Установка нового таймера
    if (currentChat && !currentChat.problemResolved) {
      inactivityTimeoutRef.current = setTimeout(checkInactivity, INACTIVITY_TIMEOUT);
    }

    // Очистка при размонтировании
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [currentChat]);

  // Создание нового чата
  const createNewChat = async (expert: Expert) => {
    if (!expert) {
      return;
    }

    const newChat: Chat = {
      id: generateUUID(),
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
      // Сохранение на бэкенде
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newChat),
      });

      if (!response.ok) {
        throw new Error('Не удалось создать чат на бэкенде');
      }

      const savedChat = await response.json();

      // Обновляем локальное состояние после успешного сохранения на бэкенде
      setChats((prev) => {
        const updatedChats = [...prev, savedChat].sort(
          (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
        );
        return updatedChats;
      });
      setCurrentChat(savedChat);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError(error instanceof Error ? error.message : 'Не удалось создать чат');
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

      // Очищаем поле ввода сразу после создания сообщения
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Добавляем сообщение в UI сразу
      setCurrentChat((prevChat) => ({
        ...prevChat!,
        messages: [...prevChat!.messages, newMessage],
      }));

      // Отправляем сообщение на API
      const response = await fetch(`/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...currentChat.messages, newMessage],
          expertId: selectedExpert.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Не удалось отправить сообщение');
      }

      // Получаем ответ от ИИ
      const aiResponse = await response.json();
      
      // Сохраняем обновленный чат на сервере
      await fetch(`/api/chats`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: currentChat.id,
          messages: [...currentChat.messages, newMessage, {
            role: aiResponse.role,
            content: aiResponse.content,
            timestamp: Date.now()
          }],
        }),
      });
      
      // Добавляем ответ ИИ в чат
      setCurrentChat((prevChat) => ({
        ...prevChat!,
        messages: [...prevChat!.messages, {
          role: aiResponse.role,
          content: aiResponse.content,
          timestamp: Date.now()
        }],
      }));

      // Очищаем поле ввода
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Не удалось отправить сообщение');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработка ответа на вопрос о решении проблемы
  const handleProblemResolution = async (resolved: boolean) => {
    if (!currentChat) return;

    setChats((prev) => {
      const updatedChats = prev.map((chat) =>
        chat.id === currentChat.id ? { ...chat, problemResolved: resolved } : chat
      );
      return updatedChats;
    });
  };

  // Автоизменение высоты текстового поля
  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const handleNewChat = () => {
    // Очищаем текущий чат и выбранного эксперта
    setCurrentChat(null);
    setSelectedExpert(null);
    setMessage('');
    localStorage.removeItem('selected_chat_id');
  };

  const handleChatSelect = (chat: Chat) => {
    setCurrentChat(chat);
    // Устанавливаем выбранного эксперта для чата
    const expert = experts.find((e) => e.id === chat.expertId);
    if (expert) {
      setSelectedExpert(expert);
    }
    localStorage.setItem('selected_chat_id', chat.id);
  };

  return (
    <div className="flex h-screen bg-[#343541]">
      {/* Sidebar */}
      <div className="w-64 bg-[#202123] h-screen flex flex-col">
        {/* New Chat Button */}
        <button
          onClick={handleNewChat}
          className="flex items-center justify-center gap-3 p-3 text-[#FFFFFF] hover:bg-[#2A2B32] transition-colors duration-200 text-sm mb-2 border border-[#4E505E] rounded-lg mx-2 mt-2"
        >
          <svg
            stroke="currentColor"
            fill="none"
            strokeWidth="2"
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Новый чат
        </button>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => handleChatSelect(chat)}
              className={`p-3 text-sm cursor-pointer flex items-center gap-3 ${
                currentChat?.id === chat.id
                  ? 'bg-[#343541] text-[#FFFFFF]'
                  : 'text-[#FFFFFF] hover:bg-[#2A2B32]'
              }`}
            >
              <svg
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                height="1em"
                width="1em"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {chat.title || 'Новый чат'}
            </div>
          ))}
        </div>

        {/* GitHub Link */}
        <div className="p-4 border-t border-red-500">
          <a 
            href="https://github.com/LibreExpert/LibreExpert" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-red-500 hover:text-red-400 transition-colors flex flex-col items-center"
          >
            <div className="font-medium">LibreExpert</div>
          </a>
        </div>
      </div>

      {/* Main Content */}
      {!selectedExpert ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-2xl w-full mx-auto px-6 py-8 bg-[#343541] rounded-lg">
            <h1 className="text-3xl font-bold mb-8 text-center text-[#FFFFFF]">
              Выберите эксперта для нового чата
            </h1>
            <div className="space-y-4">
              <ExpertSelector onSelect={handleExpertSelect} selectedExpertId={null} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col bg-[#343541]">
            {/* Заголовок чата */}
            {selectedExpert && (
              <div className="flex items-center p-4 border-b border-[#565869] bg-[#343541]">
                <div className="w-8 h-8 rounded-full bg-[#10A37F] flex items-center justify-center text-white mr-3">
                  AI
                </div>
                <div>
                  <h2 className="text-[#FFFFFF] font-medium">{selectedExpert.name}</h2>
                  <p className="text-sm text-[#ACB2C0]">{selectedExpert.description}</p>
                </div>
              </div>
            )}
            
            {/* Область сообщений */}
            <ScrollArea className="flex-1 p-4 overflow-y-auto">
              <div className="max-w-3xl mx-auto">
                {currentChat?.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`py-6 ${
                      msg.role === 'assistant' ? 'bg-[#444654]' : ''
                    } -mx-4 px-4`}
                  >
                    <div className="max-w-3xl mx-auto flex gap-4">
                      <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0">
                        {msg.role === 'assistant' ? (
                          <div className="bg-[#10A37F] rounded-sm w-full h-full flex items-center justify-center text-[#FFFFFF]">
                            AI
                          </div>
                        ) : (
                          <div className="bg-[#40414F] rounded-sm w-full h-full flex items-center justify-center text-[#FFFFFF]">
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
                                  className="bg-[#40414F] p-4 rounded-lg overflow-x-auto"
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
                                  className="absolute top-2 right-2 bg-[#2A2B32] text-[#FFFFFF] px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
                                  className="bg-[#40414F] px-1 py-0.5 rounded"
                                >
                                  {children}
                                </code>
                              );
                            },
                            p: ({ children }) => (
                              <p className="text-[#FFFFFF] mb-4 last:mb-0">{children}</p>
                            ),
                            a: ({ children, href }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#10A37F] hover:underline"
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
                        className="px-3 py-1 bg-[#10A37F] text-[#FFFFFF] rounded hover:bg-[#0D926F] transition-colors"
                      >
                        Да, решено
                      </button>
                      <button
                        onClick={() => handleProblemResolution(false)}
                        className="px-3 py-1 bg-[#40414F] text-[#FFFFFF] rounded hover:bg-[#2A2B32] transition-colors"
                      >
                        Нет, нужна помощь
                      </button>
                    </div>
                  )}
              </div>
            </ScrollArea>

            {/* Message input */}
            <div className="border-t border-[#565869] p-4">
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      adjustTextareaHeight();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Отправьте сообщение..."
                    className="w-full rounded-lg bg-[#40414F] text-[#FFFFFF] placeholder-[#ACB2C0] p-4 pr-12 resize-none overflow-hidden border border-[#565869] focus:outline-none focus:border-[#10A37F] focus:ring-1 focus:ring-[#10A37F]"
                    style={{ minHeight: '60px' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || message.trim() === ''}
                    className={`absolute right-2 bottom-2 p-2 rounded-lg ${
                      isLoading || message.trim() === ''
                        ? 'opacity-50 cursor-not-allowed'
                        : 'bg-[#10A37F] hover:bg-[#0D926F] text-[#FFFFFF]'
                    }`}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22 2L11 13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M22 2L15 22L11 13L2 9L22 2Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
