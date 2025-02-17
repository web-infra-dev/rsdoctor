import { runClient, client } from './client.js';
import { Tools } from './tools.js';
import dotenv from 'dotenv';

import OpenAI from 'openai';
dotenv.config();

const main = async () => {
  const openai = new OpenAI({
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    ...JSON.parse(process.env.OPENAI_INIT_OPTIONS ?? '{}'),
  });
  await runClient();
  const { tools } = await client.listTools();
  console.log('mcp tools', tools);

  // this is a 'bridge' between openai and mcp
  const openaiTools = tools.map((tool) => {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    };
  }) as OpenAI.Chat.Completions.ChatCompletionTool[];

  // message manager
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: 'Your are a webpack chunk analysis assistant.',
    },
    {
      role: 'user',
      content: 'Find the chunk info of chunk 150.',
    },
  ];

  // round 1 fetch openai response
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_NAME ?? 'gpt-4o-2024-08-06', // default model
    temperature: 0,
    max_tokens: 16384,
    messages,
    tools: openaiTools, // tools bridge mcp tools -> openai tools
  });
  const { choices } = response;

  // round 1: get chunk info
  const toolsCall = choices[0].message?.tool_calls as any;
  console.log('[mcp call]', toolsCall[0].function.name);

  const { content } = (await client.callTool({
    name: toolsCall[0].function.name,
    arguments: JSON.parse(toolsCall[0].function.arguments),
  })) as { content: any[] };

  const { text } = content[0] as any;
  const result = JSON.parse(text);
  console.log('[mcp call] result:', result);

  messages.push(response.choices[0].message);
  messages.push({
    role: 'tool',
    tool_call_id: toolsCall[0].id,
    content: JSON.stringify(result),
  });
  // add new prompt
  messages.push({
    role: 'user',
    content: 'Analyze the first one module details of the chunk',
  });

  // round 2 get module info of the chunk
  const completion2 = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_NAME ?? 'gpt-4o-2024-08-06', // default model
    temperature: 0,
    max_tokens: 16384,
    messages,
    tools: openaiTools,
    store: true,
  });

  const toolsCall2 = completion2.choices[0].message?.tool_calls as any;
  console.log('[mcp call]', toolsCall2[0].function.name);
  const { content: content2 } = (await client.callTool({
    name: toolsCall2[0].function.name,
    arguments: JSON.parse(toolsCall2[0].function.arguments),
  })) as { content: any[] };
  const { text: text2 } = content2[0] as any;
  const result2 = JSON.parse(text2);
  console.log('[mcp call] result:', result2);

  messages.push(completion2.choices[0].message);
  messages.push({
    role: 'tool',
    tool_call_id: toolsCall2[0].id,
    content: JSON.stringify(result2),
  });
  messages.push({
    role: 'user',
    content: `Analyze the module and see which npm packages they come from`,
  });

  // round 3 get module info of the chunk
  const completion3 = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_NAME ?? 'gpt-4o-2024-08-06', // default model
    temperature: 0,
    max_tokens: 16384,
    messages,
    tools: openaiTools,
    store: true,
  });
  //   const toolsCall3 = completion3.choices[0].message?.tool_calls as any;
  const messages3 = completion3.choices[0].message;
  console.log('[messages3]', JSON.stringify(messages3, null, 2));
};

main();
