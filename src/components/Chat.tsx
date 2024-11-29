import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Paperclip, X } from 'lucide-react'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { ChatOpenAI } from '@langchain/openai'
import { OpenAIEmbeddings } from '@langchain/openai'
import { MemoryVectorStore } from "langchain/vectorstores/memory"
import { loadQAStuffChain } from "langchain/chains"
import { Input } from "@/components/ui/input"

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  attachment?: File
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isApiKeySet, setIsApiKeySet] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [vectorStore, setVectorStore] = useState<MemoryVectorStore | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key')
    if (savedApiKey) {
      setApiKey('*'.repeat(savedApiKey.length))
      setIsApiKeySet(true)
    }
  }, [])

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (apiKey.includes('*')) return // Don't save if showing masked key
    localStorage.setItem('openai_api_key', apiKey)
    setApiKey('*'.repeat(apiKey.length))
    setIsApiKeySet(true)
  }

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value)
    setIsApiKeySet(false)
  }

  const resetApiKey = () => {
    localStorage.removeItem('openai_api_key')
    setApiKey('')
    setIsApiKeySet(false)
  }

  const getModel = () => {
    const key = localStorage.getItem('openai_api_key')
    if (!key) throw new Error('API key not set')
    
    return new ChatOpenAI({
      openAIApiKey: key,
      modelName: "gpt-4o-mini",
      temperature: 0,
    })
  }

  const getEmbeddings = () => {
    const key = localStorage.getItem('openai_api_key')
    if (!key) throw new Error('API key not set')
    
    return new OpenAIEmbeddings({
      openAIApiKey: key,
    })
  }

  const processFile = async (file: File) => {
    try {
      if (!isApiKeySet) {
        throw new Error('Please set your API key first')
      }

      const text = await file.text()
      
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      })
      
      const docs = await splitter.createDocuments([text], [{
        source: file.name,
        type: file.type,
        size: file.size,
      }])

      console.log('Processing file:', file.name)
      console.log('Created chunks:', docs.length)
      
      const embeddings = getEmbeddings()
      const store = await MemoryVectorStore.fromDocuments(docs, embeddings)
      setVectorStore(store)
      
      console.log('File processed successfully:', file.name)
    } catch (error) {
      console.error('Error processing file:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Error processing file: ' + (error instanceof Error ? error.message : 'Unknown error occurred'),
        role: 'assistant'
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setAttachment(file)
      await processFile(file)
    }
  }

  const removeAttachment = () => {
    setAttachment(null)
    setVectorStore(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && !attachment) || isLoading || !isApiKeySet) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      attachment: attachment || undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    
    setIsLoading(true)

    try {
      let response: string
      const model = getModel()

      if (vectorStore) {
        // Use RAG if we have documents loaded
        const relevantDocs = await vectorStore.similaritySearch(input, 3)
        const chain = loadQAStuffChain(model)
        
        // Prepare context from relevant documents
        const context = relevantDocs
          .map(doc => `Content: ${doc.pageContent}\nSource: ${doc.metadata.source || 'Unknown'}`)
          .join('\n\n')

        // Create a detailed prompt
        const prompt = `
Context from uploaded documents:
${context}

Based on the above context, please answer this question:
${input}

If the answer cannot be found in the context, please say so. Always reference the source of information when possible.`

        const result = await chain.call({
          input_documents: relevantDocs,
          question: prompt,
        })
        response = result.text
      } else {
        // Regular chat if no documents loaded
        const completion = await model.invoke(input)
        if (Array.isArray(completion.content)) {
          response = completion.content
            .filter(c => 'type' in c && c.type === 'text')
            .map(c => ('text' in c ? c.text : ''))
            .join(' ')
        } else {
          response = String(completion.content)
        }
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: response || 'Sorry, I could not generate a response.',
        role: 'assistant'
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Error: ' + (error instanceof Error ? error.message : 'Unknown error occurred'),
        role: 'assistant'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 space-y-4">
        {!isApiKeySet && (
          <form onSubmit={handleApiKeySubmit} className="max-w-sm mx-auto p-4 space-y-4">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Enter OpenAI API Key</h2>
              <p className="text-sm text-gray-500">Your API key will be stored locally in your browser.</p>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="sk-..."
                className="flex-1"
              />
              <Button type="submit" disabled={!apiKey || apiKey.includes('*')}>
                Save
              </Button>
            </div>
          </form>
        )}

        {isApiKeySet && (
          <div className="flex items-center justify-between max-w-sm mx-auto p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm">API Key: {apiKey}</span>
            </div>
            <Button variant="outline" size="sm" onClick={resetApiKey}>
              Reset Key
            </Button>
          </div>
        )}

        <ScrollArea className="h-[calc(100vh-200px)] rounded-md border">
          <div className="p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 flex flex-col ${
                  message.role === 'assistant' ? 'items-start' : 'items-end'
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === 'assistant'
                      ? 'bg-muted'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="max-w-2xl mx-auto px-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
              <span className="sr-only">Attach file</span>
            </Button>
            {attachment && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{attachment.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeAttachment}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove attachment</span>
                </Button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isApiKeySet ? "Type your message..." : "Please set your API key first"}
              disabled={!isApiKeySet}
              className="flex-1 min-h-[40px] max-h-[100px] p-2 rounded-md border border-input bg-background text-sm resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              rows={1}
            />
            <Button type="submit" size="icon" disabled={isLoading || !isApiKeySet}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}