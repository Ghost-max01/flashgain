"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { X, Send, User, Bot, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface LiveChatProps {
  onClose: () => void
}

interface Message {
  id: number
  text: string
  sender: "user" | "agent"
  timestamp: Date
  isImage?: boolean
  imageUrl?: string
}

export function LiveChat({ onClose }: LiveChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello good day\n\nWhat do you need help on⁉️\n\nPick 1 number below:\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification.",
      sender: "agent",
      timestamp: new Date(),
    },
  ])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isLoading) return

    const userInput = newMessage.trim()
    
    // Add user message
    const userMessage: Message = {
      id: messages.length + 1,
      text: userInput,
      sender: "user",
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setNewMessage("")
    setIsLoading(true)

    try {
      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userInput,
          sessionId: localStorage.getItem('chatSessionId') || crypto.randomUUID()
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()

      // Store session ID if new
      if (data.sessionId) {
        localStorage.setItem('chatSessionId', data.sessionId)
      }

      // Add bot response
      const botMessage: Message = {
        id: messages.length + 2,
        text: data.reply,
        sender: "agent",
        timestamp: new Date(),
        isImage: data.hasImage || false,
        imageUrl: data.imageUrl || undefined,
      }
      setMessages(prev => [...prev, botMessage])

      // If there's a follow-up menu, add it
      if (data.followUpMenu) {
        const menuMessage: Message = {
          id: messages.length + 3,
          text: data.followUpMenu,
          sender: "agent",
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, menuMessage])
      }

    } catch (error) {
      console.error('Chat error:', error)
      // Add error message
      const errorMessage: Message = {
        id: messages.length + 2,
        text: "Sorry, I'm having trouble connecting. Please try again or contact support.",
        sender: "agent",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Function to show menu again
  const showMenu = () => {
    const menuMessage: Message = {
      id: messages.length + 1,
      text: "What do you need help on⁉️\n\nPick 1 number below:\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification.",
      sender: "agent",
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, menuMessage])
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4" style={{ paddingBottom: "120px" }}>
      <div className="bg-white rounded-t-2xl w-full max-w-md h-[500px] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-orange-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">FlashGain 9ja Support</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-xs text-gray-500">Online</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={showMenu}
              className="hover:bg-orange-200"
              title="Show Menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="hover:bg-orange-200"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="flex items-start gap-2 max-w-[85%]">
                {message.sender === "agent" && (
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-3 w-3 text-orange-600" />
                  </div>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl text-sm ${
                    message.sender === "user"
                      ? "bg-orange-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100"
                  }`}
                >
                  {message.isImage && message.imageUrl && (
                    <div className="mb-2">
                      <img 
                        src={message.imageUrl} 
                        alt="Support image" 
                        className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition"
                        onClick={() => window.open(message.imageUrl, '_blank')}
                      />
                    </div>
                  )}
                  <div className="whitespace-pre-line">{message.text}</div>
                  <div className={`text-xs mt-1 ${message.sender === "user" ? "text-orange-100" : "text-gray-400"}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {message.sender === "user" && (
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-3 w-3 text-gray-600" />
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 max-w-[85%]">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                  <Bot className="h-3 w-3 text-orange-600" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-white rounded-b-2xl">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type 1, 2, 3, 4, or 5..."
              className="flex-1 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300"
              disabled={isLoading || !newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Reply with 1, 2, 3, 4, or 5 for menu options
          </p>
        </form>
      </div>
    </div>
  )
}
