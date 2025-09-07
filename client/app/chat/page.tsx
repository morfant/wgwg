
'use client';

import { useEffect, useMemo, useState } from 'react';
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
  type RoomSummary = { id: string; name: string; count: number };
  const [summaries, setSummaries] = useState<Record<string, RoomSummary>>({});
  const [dynamicRooms, setDynamicRooms] = useState<string[]>([]);

  const BACKEND_URL = process.env.NEXT_PUBLIC_CHAT_BACKEND_URL || 'http://localhost:4001';

  const createRoom = () => {
    if (roomName.trim()) {
      const roomId = Date.now().toString();
      router.push(`/chat/${roomId}?name=${encodeURIComponent(roomName)}`);
    }
  };

  const joinRoom = (roomId: string, name?: string) => {
    const suffix = name ? `?name=${encodeURIComponent(name)}` : '';
    router.push(`/chat/${roomId}${suffix}`);
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
    },
    {
      id: 'general',
      name: '일반 토론',
      description: '자유로운 주제로 대화하세요',
      icon: Users,
      variant: 'default' as const,
    },
    {
      id: 'philosophy',
      name: '철학 토론',
      description: '깊이 있는 철학적 담론',
      icon: Brain,
      variant: 'default' as const,
    }
  ];

  // All room ids to show: predefined + dynamically discovered
  const allRoomIds = useMemo(() => {
    const base = quickRooms.map(r => r.id);
    const extra = dynamicRooms.filter(id => !base.includes(id));
    return [...base, ...extra];
  }, [dynamicRooms]);

  // Poll backend for room summaries
  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/rooms/summary`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const map: Record<string, RoomSummary> = {};
        const ids: string[] = [];
        if (data?.rooms && Array.isArray(data.rooms)) {
          for (const r of data.rooms) {
            if (r?.id) {
              const id = String(r.id);
              ids.push(id);
              map[id] = { id, name: String(r.name ?? id), count: Number(r.count || 0) };
            }
          }
        }
        setSummaries(map);
        setDynamicRooms(ids);
      } catch (_) {
        // ignore fetch errors (e.g., server not running)
      }
    };

    fetchSummary();
    const t = setInterval(fetchSummary, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/30 dark:to-muted/20 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-3">
            <MessageCircle className="h-10 w-10 text-primary mr-2" />
            <div className="text-3xl md:text-4xl font-semibold tracking-tight">
              와글와글
            </div>
          </div>
          <p className="text-muted-foreground text-base md:text-lg">
            실시간 채팅으로 소통하는 공간
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="rounded-xl border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm transition-shadow hover:shadow-md">
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
                  className="h-12 text-base rounded-lg"
                />
              </div>
              <Button
                onClick={createRoom}
                disabled={!roomName.trim()}
                className="w-full h-12 text-base rounded-lg shadow-sm hover:shadow"
                size="default"
              >
                <Plus className="h-5 w-5 mr-2" />
                채팅룸 생성
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-xl border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm transition-shadow hover:shadow-md">
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
                      onClick={() => joinRoom(room.id, room.name)}
                      variant={room.variant}
                      className="w-full justify-start text-left h-auto py-4 rounded-lg shadow-sm hover:shadow transition hover:translate-y-px"
                      size="default"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-5 w-5" />
                          <div>
                            <div className="font-medium tracking-tight">{room.name}</div>
                            <div className="text-xs text-muted-foreground">{room.description}</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="ml-auto rounded-full">
                          {summaries[room.id]?.count ?? 0} 명
                        </Badge>
                      </div>
                    </Button>
                    {index < quickRooms.length - 1 && <Separator className="my-2" />}
                  </div>
                );
              })}
              {/* Dynamically discovered rooms */}
              {allRoomIds
                .filter(id => !quickRooms.some(q => q.id === id))
                .map((id, index) => (
                  <div key={id}>
                    <Button
                      onClick={() => joinRoom(id, summaries[id]?.name)}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-4 rounded-lg shadow-sm hover:shadow transition hover:translate-y-px"
                      size="default"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <MessageCircle className="h-5 w-5" />
                          <div>
                            <div className="font-medium tracking-tight">{summaries[id]?.name ?? id}</div>
                            <div className="text-xs text-muted-foreground">활성 채팅룸</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="ml-auto rounded-full">
                          {summaries[id]?.count ?? 0} 명
                        </Badge>
                      </div>
                    </Button>
                    {index < allRoomIds.length - 1 && <Separator className="my-2" />}
                  </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            실시간 채팅을 통해 다양한 사람들과 소통해보세요
          </p>
        </div>
      </div>
    </div>
  );
}
