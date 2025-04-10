import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { logger } from '@rsdoctor/utils/logger';
import { z } from 'zod';

interface Argument {
  name: string;
  type: string;
}

interface Message {
  role: 'user' | 'assistant'; // Restrict role to specific values
  text: string;
}

interface Prompt {
  description: string | undefined;
  name: string;
  arguments: Argument[];
  messages: Message[];
}

interface PromptsData {
  prompts: Prompt[];
}

/**
 * Registers prompts defined in a file with the server
 *
 * @param {McpServer} server - The server object to register prompts with
 * @param {PromptsData} promptsData - The prompts data object containing prompts
 */
function registerPredefinedPrompts(
  server: McpServer,
  promptsData: PromptsData,
) {
  promptsData.prompts.forEach((prompt: Prompt) => {
    // Build the schema object for Zod validation
    const schemaObj: Record<string, z.ZodTypeAny> = {};

    prompt.arguments.forEach((arg: Argument) => {
      switch (arg.type.toLowerCase()) {
        case 'string':
          schemaObj[arg.name] = z.string();
          break;
        case 'number':
          schemaObj[arg.name] = z.number();
          break;
        case 'boolean':
          schemaObj[arg.name] = z.boolean();
          break;
        default:
          schemaObj[arg.name] = z.any();
      }
    });

    // Register the prompt with the server
    server.prompt(
      prompt.name,
      schemaObj,
      (args: Record<string, any>, extra: RequestHandlerExtra) => ({
        messages: prompt.messages.map((message: Message) => {
          let text = message.text;
          prompt.arguments.forEach((arg: Argument) => {
            const regex = new RegExp(`\\$\\{${arg.name}\\}`, 'g');
            text = text.replace(regex, args[arg.name]);
          });

          return {
            role: message.role as 'user' | 'assistant',
            content: {
              type: 'text',
              text: text,
            },
          };
        }),
        _meta: {},
        description: prompt.description,
      }),
    );

    logger.info(`✅ Registered prompt: ${prompt.name}`);
  });

  logger.info(`✅ Total prompts registered: ${promptsData.prompts.length}`);
}

export { registerPredefinedPrompts };
