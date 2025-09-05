
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Plus, Users, Coffee, Brain } from 'lucide-react';

export default function ChatLobby() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');

  const createRoom = () => {
    if (roomName.trim()) {
      const roomId = Date.now().toString();
      router.push(`/chat/${roomId}?name=${encodeURIComponent(roomName)}`);
    }
  };

  const joinRoom = (roomId: string) => {
    router.push(`/chat/${roomId}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      createRoom();
    }
  };

  const quickRooms = [
    {
      id: 'demo',
      name: '데모 룸',
      description: '테스트 및 데모용 채팅룸',
      icon: MessageCircle,
      variant: 'default' as const,
      users: 3
    },
    {
      id: 'general',
      name: '일반 토론',
      description: '자유로운 주제로 대화하세요',
      icon: Users,
      variant: 'secondary' as const,
      users: 12
    },
    {
      id: 'philosophy',
      name: '철학 토론',
      description: '깊이 있는 철학적 담론',
      icon: Brain,
      variant: 'outline' as const,
      users: 7
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <MessageCircle className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              와글와글
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            실시간 채팅으로 소통하는 공간
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                새 채팅룸 만들기
              </CardTitle>
              <CardDescription>
                나만의 채팅룸을 만들어서 친구들과 대화해보세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="채팅룸 이름을 입력하세요..."
                  className="text-lg"
                />
              </div>
              <Button
                onClick={createRoom}
                disabled={!roomName.trim()}
                className="w-full text-lg py-6"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                채팅룸 생성
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                빠른 입장
              </CardTitle>
              <CardDescription>
                미리 준비된 채팅룸에 바로 참여하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickRooms.map((room, index) => {
                const IconComponent = room.icon;
                return (
                  <div key={room.id}>
                    <Button
                      onClick={() => joinRoom(room.id)}
                      variant={room.variant}
                      className="w-full justify-start text-left py-6 h-auto"
                      size="lg"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-5 w-5" />
                          <div>
                            <div className="font-semibold">{room.name}</div>
                            <div className="text-sm opacity-70">{room.description}</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="ml-auto">
                          {room.users} 명
                        </Badge>
                      </div>
                    </Button>
                    {index < quickRooms.length - 1 && <Separator className="my-2" />}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            실시간 채팅을 통해 다양한 사람들과 소통해보세요
          </p>
        </div>
      </div>
    </div>
  );
}
