'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Send, MessageCircle, User, Users, Wifi, WifiOff, Loader2 } from 'lucide-react';

interface Message {
  text: string;
  sender: string;
}

export default function ChatRoom() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.id as string;
  const searchParamName = searchParams.get('name');
  const [roomName, setRoomName] = useState<string>(searchParamName || roomId);
  const BACKEND_URL = process.env.NEXT_PUBLIC_CHAT_BACKEND_URL || 'http://localhost:4001';
  
  const [nickname, setNickname] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState<'initializing' | 'enter-nickname' | 'chatting'>('initializing');
  const [users, setUsers] = useState<string[]>([]);
  const [inHistoryReplay, setInHistoryReplay] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const joinChat = useCallback((nameToJoin: string) => {
    const nicknameToUse = nameToJoin.trim();
    if (!nicknameToUse) {
      setInitializationStatus('enter-nickname');
      return;
    }

    const wsUrl = BACKEND_URL.replace(/^http/, 'ws');
    ws.current = new WebSocket(`${wsUrl}/ws/${roomId}/${nicknameToUse}`);

    ws.current.onopen = () => {
      console.log(`WebSocket connected to room ${roomId}`);
      setIsConnected(true);
      setInitializationStatus('chatting');
      setNickname(nicknameToUse);

      try {
        const nicknames = JSON.parse(localStorage.getItem('chatNicknames') || '{}');
        nicknames[roomId] = nicknameToUse;
        localStorage.setItem('chatNicknames', JSON.stringify(nicknames));
      } catch (error) {
        console.error('Failed to save nickname to localStorage:', error);
      }
    };

    ws.current.onmessage = (event) => {
      const text = String(event.data ?? "");

      // Handle history markers
      if (text === "[히스토리 시작]") {
        setInHistoryReplay(true);
        return; // do not render marker
      }
      if (text === "[히스토리 종료]") {
        setInHistoryReplay(false);
        return; // do not render marker
      }

      // Handle live user list broadcast
      if (text.startsWith("SYSTEM: 현재 접속자 - ")) {
        const list = text.replace("SYSTEM: 현재 접속자 - ", "");
        const parsed = list
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        setUsers(parsed);
      }

      setMessages((prev) => [...prev, { text, sender: 'server' }]);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setInitializationStatus('enter-nickname');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setInitializationStatus('enter-nickname');
    };
  }, [roomId, setInHistoryReplay, setUsers, setMessages, setIsConnected, setInitializationStatus, setNickname]);

  const handleJoin = () => {
    joinChat(nickname);
  };

  useEffect(() => {
    // This effect determines the initial screen
    try {
      const storedNicknames = JSON.parse(localStorage.getItem('chatNicknames') || '{}');
      const savedNickname = storedNicknames[roomId];
      if (savedNickname) {
        // If we have a nickname, try to join automatically.
        // The UI will show a loading spinner until connection is successful.
        joinChat(savedNickname);
      } else {
        // No nickname, show the input screen.
        setInitializationStatus('enter-nickname');
      }
    } catch (error) {
      console.error('Failed to read nicknames from localStorage:', error);
      // On error, default to showing the input screen.
      setInitializationStatus('enter-nickname');
    }
  }, [roomId, joinChat]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMessage.trim() && ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(currentMessage);
      setCurrentMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && initializationStatus === 'enter-nickname') {
      handleJoin();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Resolve room friendly name from backend or register if provided
    const resolveName = async () => {
      try {
        if (!searchParamName) {
          const res = await fetch(`${BACKEND_URL}/rooms/${roomId}/meta`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (data?.name) setRoomName(String(data.name));
          }
        } else {
          // Ensure backend stores the provided name
          await fetch(`${BACKEND_URL}/rooms/${roomId}/name`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: searchParamName })
          }).catch(() => {});
        }
      } catch (_) {
        // ignore
      }
    };
    resolveName();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

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

  const getInitial = (name: string) => {
    const n = (name || '').trim();
    return n ? n[0].toUpperCase() : '?';
  };

  const colorFromString = (str: string) => {
    // Deterministic HSL color from string
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    const s = 65; // saturation
    const l = 55; // lightness
    return `hsl(${h} ${s}% ${l}%)`;
  };

  const isSystemMessage = (text: string) => {
    return (
      text.startsWith('SYSTEM:') ||
      text.includes('님이 채팅룸에') ||
      text.includes('나갔습니다') ||
      text.includes('has joined') ||
      text.includes('has left')
    );
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

  if (initializationStatus === 'initializing') {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30 dark:to-muted/20 p-4 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (initializationStatus === 'enter-nickname') {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30 dark:to-muted/20 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md rounded-xl border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
          <CardHeader className="text-center pb-3 relative">
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
              <CardTitle className="text-2xl tracking-tight">채팅룸 입장</CardTitle>
            </div>
            <div className="space-y-2">
              <Badge variant="outline" className="text-base px-3 py-1 rounded-full">
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
                className="h-12 text-base rounded-lg"
              />
            </div>
            <Button
              onClick={handleJoin}
              disabled={!nickname.trim()}
              className="w-full h-12 text-base rounded-lg shadow-sm hover:shadow"
              size="default"
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
    <div className="flex flex-col h-dvh bg-gradient-to-b from-background to-muted/30 dark:to-muted/20">
      <Card className="m-4 mb-2 sticky top-0 z-10 rounded-xl border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
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
                <CardTitle className="text-xl tracking-tight">{roomName}</CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className="text-sm text-white"
                    style={{ backgroundColor: colorFromString(nickname) }}
                  >
                    {getInitial(nickname)}
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
          {users.length > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="font-medium">현재 접속자 ({users.length})</span>: {users.join(', ')}
            </div>
          )}
        </CardHeader>
      </Card>

      <Card className="mx-4 mb-2 flex-1 flex flex-col rounded-xl border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <CardContent className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const parsed = parseMessage(msg.text);
              
              if (parsed.sender === 'system') {
                return (
                  <div key={index} className="flex justify-center">
                    <Badge variant="secondary" className="text-xs px-3 py-1 rounded-full">
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
                      <AvatarFallback
                        className="text-xs text-white"
                        style={{ backgroundColor: colorFromString(parsed.sender) }}
                      >
                        {getInitial(parsed.sender)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`space-y-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                      <p className="text-xs font-medium text-muted-foreground">
                        {parsed.sender}
                      </p>
                      <div className={`rounded-2xl px-3 py-2 shadow-sm ${
                        isOwnMessage 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted/60'
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

      <Card className="m-4 mt-2 sticky bottom-0 z-10 rounded-xl border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <CardContent className="p-3 md:p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 h-12 rounded-lg"
              disabled={!isConnected}
            />
            <Button
              type="submit"
              disabled={!isConnected || !currentMessage.trim()}
              className="h-12 rounded-lg shadow-sm hover:shadow"
              size="default"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
