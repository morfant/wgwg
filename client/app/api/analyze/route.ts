import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
    const { text } = await req.json();

    const { object } = await generateObject({
        model: openai('gpt-5.1'),
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
    
    Content:
    "${text}"
    `,
    });

    return Response.json(object);
}
