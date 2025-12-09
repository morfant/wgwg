'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
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
    // group: string; // 'Bot' or 'User' or 'Keyword'
    type: 'Concept' | 'Entity' | 'Action' | 'Emotion';
    val: number; // Size
    color?: string;
    description?: string;
}

interface GraphLink extends LinkObject {
    source: string | GraphNode;
    target: string | GraphNode;
    value: number; // Width
    label?: string;
    description?: string;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

export default function VisualizePage() {
    const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
    // Use a ref for graphData to always have the latest state in the async callback
    const graphDataRef = useRef<GraphData>({ nodes: [], links: [] });
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const socketRef = useRef<WebSocket | null>(null);
    const messageBuffer = useRef<string>("");
    const currentAgentType = useRef<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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
                    const { agentType, response, text: rawText } = data;
                    const text = response || rawText || "";

                    // If text is [END], it means discussion is over. Flush whatever we have.
                    if (text === "[END]") {
                        if (messageBuffer.current.trim()) {
                            processMessage(messageBuffer.current);
                            messageBuffer.current = "";
                        }
                        return;
                    }

                    // Check for speaker change
                    if (currentAgentType.current !== null && currentAgentType.current !== agentType) {
                        // Speaker changed! Process the previous speaker's buffer.
                        if (messageBuffer.current.trim()) {
                            processMessage(messageBuffer.current);
                        }
                        // Reset buffer for new speaker
                        messageBuffer.current = "";
                    }

                    // Update current speaker and append text
                    currentAgentType.current = agentType;
                    messageBuffer.current = text;
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

    const processMessage = async (text: string) => {
        console.log("Processing message:", text);
        setIsLoading(true);
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                console.error("Failed to analyze text");
                return;
            }

            const result = await response.json();
            updateGraph(result);

        } catch (error) {
            console.error("Error processing message:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateGraph = (ontology: { nodes: any[], links: any[] }) => {
        // We perform a functional update on the ref first, then sync state
        // To avoid race conditions with multiple async updates, reading from Ref is safer if they were parallel, 
        // but here we just sequentially update.

        setGraphData((prevData) => {
            const newNodes = [...prevData.nodes];
            const newLinks = [...prevData.links];
            const idMapping: { [key: string]: string } = {};

            // Merge Nodes
            const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');
            ontology.nodes.forEach(n => {
                // Find existing node by NAME to merge duplicates (case-insensitive, ignore whitespace)
                const existingNode = newNodes.find(node => normalize(node.name) === normalize(n.name));

                if (existingNode) {
                    existingNode.val += 1;
                    idMapping[n.id] = existingNode.id; // Map incoming ID to existing ID
                } else {
                    newNodes.push({
                        ...n,
                        val: 5,
                        color: getNodeColor(n.type)
                    });
                    idMapping[n.id] = n.id;
                }
            });

            // Merge Links
            ontology.links.forEach(l => {
                // Resolve IDs using the mapping
                const sourceId = idMapping[l.source] !== undefined ? idMapping[l.source] : l.source;
                const targetId = idMapping[l.target] !== undefined ? idMapping[l.target] : l.target;

                const sourceExists = newNodes.some(n => n.id === sourceId);
                const targetExists = newNodes.some(n => n.id === targetId);

                if (!sourceExists || !targetExists) {
                    console.warn(`Skipping invalid link: ${sourceId} -> ${targetId} (Original: ${l.source} -> ${l.target})`);
                    return;
                }

                const existingLink = newLinks.find(link =>
                    (link.source === sourceId && link.target === targetId) ||
                    (typeof link.source !== 'string' && (link.source as GraphNode).id === sourceId &&
                        typeof link.target !== 'string' && (link.target as GraphNode).id === targetId)
                );

                if (!existingLink) {
                    newLinks.push({
                        ...l,
                        source: sourceId,
                        target: targetId,
                        value: 1
                    });
                }
            });

            return {
                nodes: newNodes,
                links: newLinks
            };
        });
    };

    const getNodeColor = (type: string) => {
        switch (type) {
            case 'Concept': return '#00d2ff';
            case 'Entity': return '#ff0055';
            case 'Action': return '#00ffaa';
            case 'Emotion': return '#ffff00';
            default: return '#ffffff';
        }
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
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                linkLabel="label"

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

                // Custom Rendering
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
                // Render Link Labels
                linkCanvasObjectMode={() => 'after'}
                linkCanvasObject={(link, ctx, globalScale) => {
                    const l = link as GraphLink;
                    if (!l.label) return;

                    const start = l.source as GraphNode; // force-graph replaces string ID with object
                    const end = l.target as GraphNode;

                    if (typeof start !== 'object' || typeof end !== 'object') return; // Safety check

                    const textPos = Object.assign({}, start, { x: start.x! + (end.x! - start.x!) / 2, y: start.y! + (end.y! - start.y!) / 2 });

                    const fontSize = 10 / globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    const textWidth = ctx.measureText(l.label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

                    ctx.fillStyle = 'rgba(0, 0, 17, 0.8)';

                    if (textPos.x !== undefined && textPos.y !== undefined) {
                        ctx.fillRect(textPos.x - bckgDimensions[0] / 2, textPos.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                        ctx.fillText(l.label, textPos.x, textPos.y);
                    }
                }}
            />
            <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'sans-serif', pointerEvents: 'none', backgroundColor: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>Node Legend</h3>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ width: 12, height: 12, backgroundColor: '#00d2ff', borderRadius: '50%', marginRight: 8 }}></span>
                    <span style={{ fontSize: '14px' }}>Concept</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ width: 12, height: 12, backgroundColor: '#ff0055', borderRadius: '50%', marginRight: 8 }}></span>
                    <span style={{ fontSize: '14px' }}>Entity</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ width: 12, height: 12, backgroundColor: '#00ffaa', borderRadius: '50%', marginRight: 8 }}></span>
                    <span style={{ fontSize: '14px' }}>Action</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: 12, height: 12, backgroundColor: '#ffff00', borderRadius: '50%', marginRight: 8 }}></span>
                    <span style={{ fontSize: '14px' }}>Emotion</span>
                </div>
            </div>
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    color: '#00d2ff',
                    fontFamily: 'sans-serif',
                    fontSize: '14px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    border: '1px solid #00d2ff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 0 10px rgba(0, 210, 255, 0.3)'
                }}>
                    <div style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid #00d2ff',
                        borderTop: '2px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    Processing...
                    <style jsx>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
