'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import * as d3 from 'd3';
import { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d';

// Dynamically import ForceGraph2D with no SSR to avoid "window is not defined"
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
    ssr: false,
    loading: () => <div className="text-white">Loading Graph...</div>
});

// ForceGraph Types (Adding custom properties)
interface GraphNode extends NodeObject {
    id: string;
    name: string;
    group: string; // 'Bot' or 'User' or 'Keyword'
    val: number; // Size
    color?: string;
}

interface GraphLink extends LinkObject {
    source: string | GraphNode;
    target: string | GraphNode;
    value: number; // Width
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

// Simple keyword extractor (Korean/English support)
const extractKeywords = (text: string): string[] => {
    if (!text) return [];

    // Remove special characters and split by space
    const words = text
        .replace(/[^\w\s가-힣]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 1); // Filter out single characters

    // Filter out common stop words (very basic list)
    const stopWords = new Set([
        '이', '그', '저', '것', '수', '등', '들', '및', '에', '가', '을', '를', '은', '는', '도', '로', '와', '과', '한', '만',
        'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'it', 'this', 'that'
    ]);

    return words.filter((w) => !stopWords.has(w.toLowerCase()));
};


export default function VisualizePage() {
    const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const socketRef = useRef<WebSocket | null>(null);

    // Resize handler
    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // WebSocket Connection
    useEffect(() => {
        const wsUrl = 'ws://localhost:4001/ws/chat';
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            console.log('Connected to WebSocket');
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.agentType) {
                    // Use agentType directly as the speaker identity
                    // If agentType is 'User', treat as User. Otherwise, it's a specific Bot name.
                    const speaker = data.agentType;
                    const text = data.response || data.text || "";

                    if (text === "[END]") return;

                    processMessage(text, speaker);
                }

            } catch (e) {
                console.error('Error parsing message', e);
            }
        };

        return () => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
        };
    }, []);

    const processMessage = (text: string, speaker: string) => {
        const keywords = extractKeywords(text);
        if (keywords.length === 0) return;

        setGraphData((prevData) => {
            const newNodes = [...prevData.nodes];
            const newLinks = [...prevData.links];

            // Use speaker as the persistent ID
            const speakerId = speaker;

            // Check if speaker node exists
            let speakerNode = newNodes.find(n => n.id === speakerId);

            if (!speakerNode) {
                speakerNode = {
                    id: speakerId,
                    name: speaker,
                    group: speaker === 'User' ? 'User' : 'Bot',
                    val: 8, // Initial size for speaker
                    color: speaker === 'User' ? '#00d2ff' : '#ff0055'
                };
                newNodes.push(speakerNode);
            } else {
                // Pulse the speaker node
                speakerNode.val = (speakerNode.val || 8) + 2;
            }

            // Add Keyword Nodes
            keywords.forEach((kw) => {
                // Check if keyword node already exists (Global persistence)
                let kwNode = newNodes.find(n => n.id === kw);
                if (!kwNode) {
                    kwNode = {
                        id: kw,
                        name: kw,
                        group: 'Keyword',
                        val: 3,
                        color: '#ffffff'
                    };
                    newNodes.push(kwNode);
                } else {
                    // Increase size if recurring
                    kwNode.val += 1;
                }

                // Link Speaker to Keyword
                // Check if link already exists
                const linkExists = newLinks.some(l =>
                    (l.source === speakerId && l.target === kw) ||
                    (l.source === kw && l.target === speakerId) // Undirected graph check usually, but ForceLink uses source/target
                );

                if (!linkExists) {
                    newLinks.push({
                        source: speakerId,
                        target: kw,
                        value: 1
                    });
                }
            });

            // Link keywords to each other
            for (let i = 0; i < keywords.length - 1; i++) {
                const source = keywords[i];
                const target = keywords[i + 1];

                const linkExists = newLinks.some(l =>
                    (l.source === source && l.target === target)
                );

                if (!linkExists) {
                    newLinks.push({
                        source: source,
                        target: target,
                        value: 0.5
                    });
                }
            }

            return {
                nodes: newNodes,
                links: newLinks
            };
        });
    };

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000011', overflow: 'hidden' }}>
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}

                // Node Styling
                nodeLabel="name"
                nodeColor="color"
                nodeRelSize={4}

                // Link Styling
                linkColor={() => 'rgba(255,255,255,0.2)'}
                linkWidth={1}

                // Forces configuration for "Space/Cosmic" feel
                d3VelocityDecay={0.6} // Low friction for floating feel
                d3AlphaDecay={0.01}   // Slow stabilization

                // Particles
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleWidth={2}

                // Background & Zoom
                backgroundColor="#000011"
                minZoom={0.5}
                maxZoom={4}

                // Custom Rendering for Glowing Nodes
                nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.name;
                    const fontSize = 12 / globalScale;

                    // Draw Node (Circle)
                    const n = node as GraphNode;
                    const r = Math.sqrt(Math.max(0, n.val || 1)) * 2;

                    ctx.beginPath();
                    ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI, false);
                    ctx.fillStyle = n.color || '#fff';
                    ctx.fill();

                    // Glow effect
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = n.color || '#fff';

                    // Draw Label
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillText(label, n.x!, n.y! + r + fontSize);

                    // Reset Shadow
                    ctx.shadowBlur = 0;
                }}
            />
            <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'sans-serif', pointerEvents: 'none' }}>
                <h1>Discussion Galaxy</h1>
                <p>Connecting keywords in real-time...</p>
            </div>
        </div>
    );
}
