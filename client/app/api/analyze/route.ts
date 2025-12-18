import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { redis, checkRedisAvailable } from '@/lib/redis';

export async function POST(req: Request) {
    const { text } = await req.json();

    // Fetch existing nodes from Redis to provide context
    let existingNodes: string[] = [];
    if (checkRedisAvailable()) {
        try {
            existingNodes = await redis.smembers('ontology:nodes');
        } catch (error) {
            console.error('Redis connection failed while fetching nodes:', error);
        }
    }

    const existingNodesContext = existingNodes.length > 0
        ? `\n\nExisting ontology nodes (reuse these names if applicable): ${existingNodes.join(', ')}`
        : '';

    const { object } = await generateObject({
        model: openai('gpt-5.2'),
        schema: z.object({
            nodes: z.array(z.object({
                id: z.string(),
                name: z.string(),
                type: z.enum(['Concept', 'Entity', 'Action', 'Emotion']),
                description: z.string().optional(),
            })),
            links: z.array(z.object({
                source: z.string(),
                target: z.string(),
                label: z.string(),
                description: z.string().optional(),
            })),
        }),
        prompt: `Analyze the following discussion content and extract an ontology graph. 
    Identify key concepts, entities, actions, or emotions as nodes.
    Identify relationships between them as links with descriptive labels.
    
    Reuse existing node names where appropriate. Only introduce new node names if the concept is distinctly different from existing ones.

    Content:
    "${text}"${existingNodesContext}
    `,
    });

    // Save new nodes to Redis
    // We can just add all of them; Redis sets handle uniqueness automatically.
    if (object.nodes.length > 0 && checkRedisAvailable()) {
        try {
            const nodeNames = object.nodes.map(n => n.name);
            await redis.sadd('ontology:nodes', ...nodeNames);
        } catch (error) {
            console.error('Redis connection failed while saving nodes:', error);
        }
    }

    return Response.json(object);
}
