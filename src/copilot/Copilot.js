import {
  invokeModel
} from './bedrock';

import { zodToJsonSchema } from 'zod-to-json-schema';

import fromJson from './create/fromJson';
import { toJson } from './update/toJson';

import { getSystemPrompt as getCreateBpmnSystemPrompt } from './create/prompt';
import { getSystemPrompt as getUpdateBpmnSystemPrompt } from './update/prompt';

import { createBpmnSchema } from './create/schema';
import { updateBpmnSchema } from './update/schema';

import handlers from './update/handlers';

export default class Copilot {
  constructor(bpmnjs) {
    this._bpmnjs = bpmnjs;

    this._handlers = handlers.map((Handler) => new Handler(bpmnjs));

    this._history = [];
  }

  async submitPrompt(prompt, setLoadingMessage) {
    this._history.push({
      role: 'user',
      content: prompt
    });

    let action;

    /**
     * 1. Decide what action to take based on the user prompt.
     */
    try {
      action = await this._getAction(prompt);
    } catch (error) {
      console.log('error', error);

      return `Error: ${error.message}`;
    }

    if (!action) {
      return 'I could not understand your request. Please try again.';
    }

    if (action === 'createBpmn') {

      setLoadingMessage('Creating BPMN process...');

      try {
        const {
          bpmnJson,
          responseText
        } = await this._createBpmn(prompt);

        const xml = await fromJson(bpmnJson, this._bpmnjs);

        console.log('xml after layout', xml);

        await this._bpmnjs.importXML(xml);

        console.log('imported', this._bpmnjs.get('elementRegistry')._elements);

        this._bpmnjs.get('canvas').zoom('fit-viewport');

        this._history.push({
          role: 'assistant',
          content: responseText
        });

        return responseText;
      } catch (error) {
        console.log('error', error);

        return `Error: ${error.message}`;
      }
    } else if (action === 'updateBpmn') {

      setLoadingMessage('Updating BPMN process...');

      try {
        const {
          changes,
          responseText
        } = await this._updateBpmn(prompt);

        let changed = [];

        for (const change of changes) {
          const { zodType } = change;

          const handler = this._handlers.find((handler) => handler.constructor.id === zodType);

          if (!handler) {
            console.error('handler not found', zodType);

            break;
          }

          const {
            changed: _changed
          } = handler.apply(change);

          for (const element of changed) {
            if (!changed.includes(element)) {
              changed.push(element);
            }
          }
        }

        if (changed.length) {
          this._bpmnjs.get('canvas').zoom('fit-viewport');

          this._bpmnjs.get('selection').select(changed);
        }

        this._history.push({
          role: 'assistant',
          content: responseText
        });

        return responseText;
      } catch (error) {
        console.log('error', error);

        return `Error: ${error.message}`;
      }
    } else if (action === 'fallback') {

      setLoadingMessage('Responding...');

      const response = await this._fallback(prompt);

      this._history.push({
        role: 'assistant',
        content: response
      });

      return response;
    }
  }

  async _getAction(prompt) {
    const bpmnJson = toJson(this._bpmnjs.getDefinitions());

    const { toolUse } = await invokeModel({
      systemPrompt: `You are a BPMN expert that helps users create and update BPMN processes. You receive a prompt from
the user and decide what action to take.

Possible actions are:
- \`createBpmn\` if the user wants to create a BPMN process
- \`updateBpmn\` if the user wants to update a BPMN process (considering the existing process)
- \`fallback\` whenever the response should be text e.g., when the requirements are unclear or if the prompt is not related to creating or updating a BPMN process; this is a fallback action; prefer to use the other actions whenever possible

# Chat history so far (limited to the last 5 messages):
${this._history.slice(-5).map(({ role, content }) => `- ${role}: ${content}`).join('\n')}

# Existing process:
${JSON.stringify(bpmnJson)}`,
      userPrompt: prompt,
      tools: [ {
        toolSpec: {
          name: 'take_action',
          description: 'Take an action',
          inputSchema: {
            json: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: 'The action to take.'
                }
              },
              required: [ 'action' ]
            }
          }
        }
      } ],
      toolChoice: {
        tool: {
          name: 'take_action'
        }
      },
      model: 'anthropic.claude-3-haiku-20240307-v1:0'
    });

    const { input } = toolUse;

    const { action } = input;

    return action;
  }

  async _createBpmn(prompt) {
    const {
      text,
      toolUse
    } = await invokeModel({
      systemPrompt: getCreateBpmnSystemPrompt(this._history),
      userPrompt: prompt,
      tools: [ {
        toolSpec: {
          name: 'create_bpmn',
          description: 'Create a BPMN process',
          inputSchema: {
            json: zodToJsonSchema(createBpmnSchema, 'createBpmn').definitions.createBpmn
          }
        }
      } ],
      toolChoice: {
        auto: {} // auto is required to allow the model to respond with both text and tool use
        // tool: {
        //   name: 'create_bpmn'
        // }
      },
      maxTokens: 4096
    });

    const response = getResponse(text);

    const { input } = toolUse;

    const { process } = input;

    return {
      bpmnJson: process,
      responseText: response
    };
  }

  async _updateBpmn(prompt) {
    const bpmnJson = toJson(this._bpmnjs.getDefinitions()),
          selected = this._bpmnjs.get('selection').get().map(({ id }) => id);

    const {
      text,
      toolUse
    } = await invokeModel({
      systemPrompt: getUpdateBpmnSystemPrompt(this._history, bpmnJson, selected),
      userPrompt: prompt,
      tools: [ {
        toolSpec: {
          name: 'update_bpmn',
          description: 'Update a BPMN process',
          inputSchema: {
            json: zodToJsonSchema(updateBpmnSchema, 'updateBpmn').definitions.updateBpmn
          }
        }
      } ],
      toolChoice: {
        auto: {} // auto is required to allow the model to respond with both text and tool use
        // tool: {
        //   name: 'update_bpmn'
        // }
      }
    });

    const response = getResponse(text);

    const { input } = toolUse;

    const { changes } = input;

    return {
      changes,
      responseText: response
    };
  }

  async _fallback(prompt) {
    const bpmnJson = toJson(this._bpmnjs.getDefinitions()),
          selected = this._bpmnjs.get('selection').get().map(({ id }) => id);

    const { text } = await invokeModel({
      systemPrompt: `You are a BPMN expert that helps users with questions related to BPMN processes. Your response is
going to be shown directly to the user. Make sure to provide a helpful response. If the requirements given by the user
are unclear, ask for clarification. If you cannot provide a helpful response or the prompt is not related to BPMN
processes, reply in a way that indicates that. Your response must not be longer than 300 characters.

# Chat history so far (limited to the last 5 messages):
${this._history.slice(-5).map(({ role, content }) => `- ${role}: ${content}`).join('\n')}

# Existing process:
${JSON.stringify(bpmnJson)}

# Elements selected by user:
${JSON.stringify(selected)}

Before answering, explain your reasoning step-by-step in <thinking> tags.
Use the <response> tags for a message that will be shown to the user. This message must not include any internals like the tool choice or the thinking explanation.

# Template:

<thinking></thinking>
<response></response>
`,
      userPrompt: prompt,
      maxTokens: 300
    });

    const response = getResponse(text);

    return response;
  }
}

/**
 * Get the response between the <response> tags.
 *
 * @param {string} text
 *
 * @returns {string}
 */
function getResponse(text) {
  const responseMatch = text.match(/<response>([^]*?)<\/response>/);

  if (!responseMatch) {
    throw new Error('<response> not found');
  }

  return responseMatch[1];
}