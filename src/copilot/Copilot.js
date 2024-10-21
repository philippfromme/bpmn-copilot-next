import OpenAI from 'openai';

import { zodResponseFormat } from "openai/helpers/zod";

import zod from 'zod';

import fromJson from './create/fromJson';
import { toJson } from './update/toJson';

import { systemPrompt as createBpmnSystemPrompt } from './create/prompt';
import { getSystemPrompt as getUpdateBpmnSystemPrompt } from './update/prompt';

import { createBpmnSchema } from './create/schema';
import { updateBpmnSchema } from './update/schema';

import handlers from './update/handlers';

const openAIApiKey = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: openAIApiKey,
  dangerouslyAllowBrowser: true
});

export default class Copilot {
  constructor(bpmnjs) {
    this._bpmnjs = bpmnjs;

    this._handlers = handlers.map((Handler) => new Handler(bpmnjs));
  }

  async submitPrompt(prompt) {
    let action;

    /**
     * 1. Decide what action to take based on the user prompt.
     */
    try {
      const response = await this._getAction(prompt, toJson(this._bpmnjs.getDefinitions()));

      ({ action } = response);
    } catch (error) {
      console.log('error', error);

      return `Error: ${error.message}`;
    }

    if (!action) {
      return 'I could not understand your request. Please try again.';
    }

    /**
     * 2. Perform the action.
     */
    if (action === 'createBpmn') {

      /**
       * 2.1. Create a new BPMN process.
       */
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

        return responseText;
      } catch (error) {
        console.log('error', error);

        return `Error: ${error.message}`;
      }
    } else if (action === 'updateBpmn') {

      /**
       * 2.2. Update an existing BPMN process.
       */
      try {
        const {
          changes,
          responseText
        } = await this._updateBpmn(prompt, toJson(this._bpmnjs.getDefinitions()));

        let changedElements = [];

        for (const change of changes) {
          const { zodType } = change;

          const handler = this._handlers.find((handler) => handler.constructor.id === zodType);

          if (!handler) {
            console.error('handler not found', zodType);

            break;
          }

          const _changedElements = handler.apply(change);

          for (const element of _changedElements) {
            if (!changedElements.includes(element)) {
              changedElements.push(element);
            }
          }
        }

        if (changedElements.length) {
          this._bpmnjs.get('canvas').zoom('fit-viewport');

          this._bpmnjs.get('selection').select(changedElements);
        }

        return responseText;
      } catch (error) {
        console.log('error', error);

        return `Error: ${error.message}`;
      }
    } else if (action === 'respondText') {

      /**
       * 2.3. Respond to a general question.
       */
      const responseText = await this._respondText(prompt);

      return responseText;
    }
  }

  async _getAction(prompt, bpmnJson) {
    const response = await this._getCompletion({
      systemPrompt: `You are a BPMN expert that helps users create and update BPMN processes. You receive a prompt from the user and decide what action to take.
Possible actions are:
- \`createBpmn\` if the user wants to create a BPMN process
- \`updatedBpmn\` if the user wants to update a BPMN process (considering the existing process)
- \`respondText\` if the prompt is not related to creating or updating a BPMN process and should be responded to with text

Existing process:
${JSON.stringify(bpmnJson)}`,
      userPrompt: prompt,
      model: 'gpt-4o-mini',
      response_format: zodResponseFormat(zod.object({
        action: zod.enum([ 'createBpmn', 'updateBpmn', 'respondText' ])
      }), 'getActionResponse')
    });

    return response;
  }

  async _createBpmn(prompt) {
    const {
      process,
      responseText
    } = await this._getCompletion({
      systemPrompt: createBpmnSystemPrompt,
      userPrompt: prompt,
      response_format: zodResponseFormat(createBpmnSchema, "createBpmnResponse")
    });

    return {
      bpmnJson: process,
      responseText
    };
  }

  async _updateBpmn(prompt, bpmnJson) {
    const {
      changes,
      responseText
    } = await this._getCompletion({
      systemPrompt: getUpdateBpmnSystemPrompt(bpmnJson),
      userPrompt: prompt,
      response_format: zodResponseFormat(updateBpmnSchema, "updateBpmnResponse")
    });

    return {
      changes,
      responseText
    };
  }

  async _respondText(prompt) {
    const { responseText } = await this._getCompletion({
      systemPrompt: `You are a BPMN expert that helps users with questions related to BPMN processes. Your response is
going to be shown directly to the user. Make sure to provide a helpful response. If you cannot provide a helpful
response or the prompt is not related to BPMN processes, reply in a way that indicates that. For example: "I'm sorry, I
cannot provide a helpful response to this question."`,
      userPrompt: prompt,
      response_format: zodResponseFormat(zod.object({
        responseText: zod.string()
      }), "respondTextResponse")
    });

    return responseText;
  }

  async _getCompletion({ systemPrompt, userPrompt, model = 'gpt-4o', ...options }) {
    const request = {
      messages: [
        {
          'role': 'system',
          'content': systemPrompt
        },
        {
          'role': 'user',
          'content': userPrompt
        }
      ],
      model,
      ...options
    };

    console.log('[OpenAI] request', request);

    const start = Date.now();

    const chatCompletion = await openai.beta.chat.completions.parse(request);

    const end = Date.now();
    
    console.log('[OpenAI] Request took', (end - start) / 1000, 'seconds');

    console.log('[OpenAI] response (raw)', chatCompletion);

    const { choices = [] } = chatCompletion;

    if (!choices.length) {
      return null;
    }

    const { message } = choices[ 0 ];

    const { content, parsed } = message;

    console.log('[OpenAI] response content', content);
    console.log('[OpenAI] response parsed', parsed);

    return parsed;
  }
}
