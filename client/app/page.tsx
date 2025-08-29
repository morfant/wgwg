'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import Slider from '@/components/Slider';

interface Message {
  sender: string;
  text: string;
  agentType: string;
}

interface ConKnob {
  value: number;
  label: string;
}

export default function Home() {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [activeMenu] = useState('와글와글 - 언어로 포화된 여기');
  const [conKnobs, setConKnobs] = useState<ConKnob[]>([{ value: 20, label: 'Reverb' }]);
  const [buttons, setButtons] = useState(Array(25).fill(false).map((_, i) => i % 5 === 0));
  const [selectedGroup, setSelectedGroup] = useState(1);
  const [tempo, setTempo] = useState(Array(5).fill(50));
  const [volume, setVolume] = useState(Array(5).fill(50));
  const [autoScroll, setAutoScroll] = useState(true);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const toggleButtonInGroup = useCallback((group: number, index: number) => {
    const start = (group - 1) * 5;
    const end = start + 5;

    setButtons(prev => {
      const newButtons = [...prev];
      for (let i = start; i < end; i++) {
        newButtons[i] = false;
      }
      newButtons[start + index] = true;
      return newButtons;
    });

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'Button',
          group: group,
          index: index + 1,
          value: true,
        })
      );
    }
  }, [socket]);

  const isActiveButton = (group: number, index: number) => {
    const start = (group - 1) * 5;
    return buttons[start + index];
  };

  const handleSliderChange = useCallback((group: number, index: number, val: number) => {
    console.log(`Group ${group}, Slider ${index} changed to ${val}`);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'Slider', group, index, value: val }));
    }
  }, [socket]);

  const sendMessage = useCallback(() => {
    if (userInput.trim() === '') return;
    
    setMessages(prev => [...prev, {
      sender: 'User',
      text: userInput,
      agentType: 'User',
    }]);
    
    setIsFetching(true);
    if (socket) {
      socket.send(JSON.stringify({ message: userInput }));
    }
    setUserInput('');
  }, [userInput, socket]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isFetching) {
      sendMessage();
    }
  };

  const renderMessage = (text: string) => {
    return { __html: marked.parse(text) };
  };

  const updateScroll = useCallback(() => {
    if (!autoScroll || !chatBoxRef.current) return;
    chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [autoScroll]);

  const handleScroll = () => {
    if (!chatBoxRef.current) return;
    const nearBottom = 
      chatBoxRef.current.scrollHeight - 
      chatBoxRef.current.scrollTop - 
      chatBoxRef.current.clientHeight < 50;
    setAutoScroll(nearBottom);
  };

  useEffect(() => {
    updateScroll();
  }, [messages, updateScroll]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4001/ws/chat');
    setSocket(ws);

    ws.onopen = () => {
      console.log('WebSocket connection opened');
      setIsConnected(true);

      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ heartbeat: 'ping' }));
          console.log('ping');
        }
      }, 30000);
      pingIntervalRef.current = interval;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type) {
        const { type, group, index, value } = data;
        if (type === 'Button') {
          console.log(`Button Event: Group ${group}, Index ${index}, Value ${value}`);
          const start = (group - 1) * 5;
          setButtons(prev => {
            const newButtons = [...prev];
            newButtons.fill(false, start, start + 5);
            newButtons[start + index - 1] = value;
            return newButtons;
          });
        }

        if (type === 'Slider') {
          console.log(`Slider Event: Group ${group}, Slider ${index}, Value ${value}`);
          if (index === 1) {
            setTempo(prev => {
              const newTempo = [...prev];
              newTempo[group - 1] = value;
              return newTempo;
            });
          } else if (index === 2) {
            setVolume(prev => {
              const newVolume = [...prev];
              newVolume[group - 1] = value;
              return newVolume;
            });
          } else {
            const knobIndex = index - 10;
            setConKnobs(prev => {
              const newKnobs = [...prev];
              if (newKnobs[knobIndex]) {
                newKnobs[knobIndex].value = value;
              }
              return newKnobs;
            });
          }
        }
      } else if (data.agentType) {
        const { agentType, response } = data;
        console.log('agentType: ', agentType);
        
        if (response === '[END]') {
          setIsFetching(false);
        } else {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (
              lastMessage &&
              lastMessage.sender === 'Bot' &&
              lastMessage.agentType === agentType
            ) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMessage,
                text: response,
              };
              return updated;
            } else {
              return [...prev, { sender: 'Bot', text: response, agentType }];
            }
          });
        }
      } else {
        console.warn('Unknown message format:', data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
      setIsFetching(false);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
      setIsFetching(false);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };

    return () => {
      if (ws) {
        ws.close();
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="app-container">
      <div className="chat-section">
        <h1>{activeMenu}</h1>
        <div className="chat-box" ref={chatBoxRef} onScroll={handleScroll}>
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.agentType}`}>
              <div dangerouslySetInnerHTML={renderMessage(message.text)} />
            </div>
          ))}
          {isFetching && (
            <div className="loading-indicator">응답을 받아오는 중입니다...</div>
          )}
        </div>
        <div className="input-container">
          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="input-box"
            disabled={isFetching || !isConnected}
          />
          <button
            onClick={sendMessage}
            className="send-button"
            disabled={isFetching || !isConnected}
          >
            {isFetching ? '......' : 'Send'}
          </button>
        </div>
      </div>

      <div className="control-section">
        {[1, 2, 3, 4, 5].map((n) => (
          <div className="group" key={n}>
            <button
              className={`big-btn ${selectedGroup === n ? 'active' : ''}`}
              onClick={() => setSelectedGroup(n)}
            >
              {n}
            </button>
            <div className="button-row">
              {[0, 1, 2, 3, 4].map((index) => (
                <button
                  key={index}
                  className={`toggle-btn ${isActiveButton(n, index) ? 'active' : ''}`}
                  onClick={() => toggleButtonInGroup(n, index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <Slider
              value={tempo[n - 1]}
              min={0}
              max={100}
              onChange={(val) => {
                setTempo(prev => {
                  const newTempo = [...prev];
                  newTempo[n - 1] = val;
                  return newTempo;
                });
                handleSliderChange(n, 1, val);
              }}
            />
            <Slider
              value={volume[n - 1]}
              min={0}
              max={100}
              onChange={(val) => {
                setVolume(prev => {
                  const newVolume = [...prev];
                  newVolume[n - 1] = val;
                  return newVolume;
                });
                handleSliderChange(n, 2, val);
              }}
            />
          </div>
        ))}

        <div className="slider-container">
          {conKnobs.map((knob, index) => (
            <div key={index + 10} style={{ marginBottom: '20px' }}>
              <Slider
                value={knob.value}
                min={0}
                max={100}
                onChange={(val) => {
                  setConKnobs(prev => {
                    const newKnobs = [...prev];
                    newKnobs[index].value = val;
                    return newKnobs;
                  });
                  handleSliderChange(0, index + 10, val);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
