'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Send, MessageCircle, User, Users, Wifi, WifiOff } from 'lucide-react';

interface Message {
  text: string;
  sender: string;
}

export default function ChatRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.id as string;
  const roomName = searchParams.get('name') || roomId;
  
  const [nickname, setNickname] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showNicknameInput, setShowNicknameInput] = useState(true);
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleJoin = () => {
    if (nickname.trim()) {
      ws.current = new WebSocket(`ws://localhost:8001/ws/${roomId}/${nickname}`);

      ws.current.onopen = () => {
        console.log(`WebSocket connected to room ${roomId}`);
        setIsConnected(true);
        setShowNicknameInput(false);
      };

      ws.current.onmessage = (event) => {
        setMessages((prevMessages) => [...prevMessages, { text: event.data, sender: 'server' }]);
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setShowNicknameInput(true);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMessage.trim() && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(currentMessage);
      setCurrentMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showNicknameInput) {
      handleJoin();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const getInitials = (name: string) => {
    if (!name) return '?';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isSystemMessage = (text: string) => {
    return text.includes('님이 채팅룸에') || text.includes('has joined') || text.includes('has left');
  };

  const parseMessage = (text: string) => {
    if (isSystemMessage(text)) {
      return { sender: 'system', message: text };
    }
    
    const colonIndex = text.indexOf(': ');
    if (colonIndex > 0) {
      return {
        sender: text.substring(0, colonIndex),
        message: text.substring(colonIndex + 2)
      };
    }
    
    return { sender: 'unknown', message: text };
  };

  if (showNicknameInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              로비로
            </Button>
            <div className="flex items-center justify-center mb-2">
              <MessageCircle className="h-8 w-8 text-primary mr-2" />
              <CardTitle className="text-2xl">채팅룸 입장</CardTitle>
            </div>
            <div className="space-y-2">
              <Badge variant="outline" className="text-lg px-4 py-1">
                {roomName}
              </Badge>
              <p className="text-sm text-muted-foreground">
                닉네임을 입력하여 채팅에 참여하세요
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="닉네임을 입력하세요"
                className="text-lg py-6"
              />
            </div>
            <Button
              onClick={handleJoin}
              disabled={!nickname.trim()}
              className="w-full text-lg py-6"
              size="lg"
            >
              <User className="h-5 w-5 mr-2" />
              채팅 참여
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="m-4 mb-2 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/chat')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                로비로
              </Button>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{roomName}</CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm">
                    {getInitials(nickname)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{nickname}</span>
              </div>
              <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    연결됨
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    연결 끊김
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="mx-4 mb-2 flex-1 flex flex-col shadow-lg">
        <CardContent className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const parsed = parseMessage(msg.text);
              
              if (parsed.sender === 'system') {
                return (
                  <div key={index} className="flex justify-center">
                    <Badge variant="secondary" className="text-xs px-3 py-1">
                      <Users className="h-3 w-3 mr-1" />
                      {parsed.message}
                    </Badge>
                  </div>
                );
              }
              
              const isOwnMessage = parsed.sender === nickname;
              
              return (
                <div key={index} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {getInitials(parsed.sender)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`space-y-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                      <p className="text-xs font-medium text-muted-foreground">
                        {parsed.sender}
                      </p>
                      <div className={`rounded-lg px-3 py-2 ${
                        isOwnMessage 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {parsed.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>
      </Card>

      <Card className="m-4 mt-2 shadow-lg">
        <CardContent className="p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1"
              disabled={!isConnected}
            />
            <Button
              type="submit"
              disabled={!isConnected || !currentMessage.trim()}
              size="lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}