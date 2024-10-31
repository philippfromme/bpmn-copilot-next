import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';

import {
  BedrockRuntimeClient,
  ConverseCommand
} from '@aws-sdk/client-bedrock-runtime';

export async function listClaudeModels() {
  const client = new BedrockClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  try {
    const command = new ListFoundationModelsCommand({});
    const response = await client.send(command);

    const claudeModels = response.modelSummaries.filter(model =>
      model.modelId.startsWith('anthropic.claude')
    );

    console.log('Available Claude models:');

    claudeModels.forEach(model => {
      console.log(`- ${model.modelId}`);
    });

    return claudeModels.map(model => model.modelId);
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listClaudeModels();

export const invokeModel = async ({
  maxTokens = 1000,
  modelId = 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  systemPrompt,
  toolChoice,
  tools,
  userPrompt
}) => {
  const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  let converseCommandInput = {
    system: [ {
      text: systemPrompt
    } ],
    messages: [
      {
        role: 'user',
        content: [ { text: userPrompt } ]
      }
    ],
    modelId,
    inferenceConfig: {
      maxTokens
    }
  };

  if (tools) {
    converseCommandInput = {
      ...converseCommandInput,
      toolConfig: {
        tools,
        toolChoice
      }
    };
  }

  console.log('[AWS Bedrock] Converse command input:', converseCommandInput);

  const command = new ConverseCommand(converseCommandInput);

  const start = Date.now();

  const apiResponse = await client.send(command);

  const end = Date.now();

  console.log('[AWS Bedrock] Request took', (end - start) / 1000, 'seconds');

  console.log('[AWS Bedrock] API response:', apiResponse);

  const { content } = apiResponse.output.message;

  console.log('[AWS Bedrock] Content:', content);

  const textResponse = content.find(block => block.text) || { text: null };

  const { text } = textResponse;

  let toolUse;

  if (tools) {
    const toolUseResponse = content.find(block => block.toolUse);

    ({ toolUse } = toolUseResponse);

    const { name, input } = toolUse;

    if (toolChoice.tool && name !== toolChoice.tool.name) {
      throw new Error('[AWS Bedrock] Unexpected tool choice:', name);
    }

    console.log('[AWS Bedrock] Tool use input:', input);
  }

  return {
    text,
    toolUse
  };
};

// export const invokeModelWithResponseStream = async (
//   prompt,
//   modelId = "anthropic.claude-3-5-sonnet-20241022-v2:0",
// ) => {
//   const client = new BedrockRuntimeClient({
//     region: process.env.AWS_REGION || "us-east-1",
//     credentials: {
//       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
//     }
//   });

//   const payload = {
//     anthropic_version: "bedrock-2023-05-31",
//     max_tokens: 1000,
//     messages: [
//       {
//         role: "user",
//         content: [{ type: "text", text: prompt }],
//       },
//     ],
//   };

//   const command = new InvokeModelWithResponseStreamCommand({
//     contentType: "application/json",
//     body: JSON.stringify(payload),
//     modelId,
//   });
//   const apiResponse = await client.send(command);

//   let completeMessage = "";

//   for await (const item of apiResponse.body) {
//     const chunk = JSON.parse(new TextDecoder().decode(item.chunk.bytes));
//     const chunk_type = chunk.type;

//     if (chunk_type === "content_block_delta") {
//       const text = chunk.delta.text;
//       completeMessage = completeMessage + text;
//       process.stdout.write(text);
//     }
//   }

//   return completeMessage;
// };