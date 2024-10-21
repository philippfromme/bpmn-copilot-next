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

    if (action === 'createBpmn') {

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

      try {
        const {
          changes,
          responseText
        } = await this._updateBpmn(
          prompt,
          toJson(this._bpmnjs.getDefinitions()),
          this._bpmnjs.get('selection').get().map(({ id }) => id)
        );

        let changed = [];

        for (const change of changes) {
          const { zodType } = change;

          const handler = this._handlers.find((handler) => handler.constructor.id === zodType);

          if (!handler) {
            console.error('handler not found', zodType);

            break;
          }

          const {
            changed: _changed,
            layout
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

        return responseText;
      } catch (error) {
        console.log('error', error);

        return `Error: ${error.message}`;
      }
    } else if (action === 'fallback') {

      const responseText = await this._fallback(prompt);

      return responseText;
    }
  }

  async _getAction(prompt, bpmnJson) {
    const response = await this._getCompletion({
      systemPrompt: `You are a BPMN expert that helps users create and update BPMN processes. You receive a prompt from the user and decide what action to take.
Possible actions are:
- \`createBpmn\` if the user wants to create a BPMN process
- \`updateBpmn\` if the user wants to update a BPMN process (considering the existing process)
- \`fallback\` whenever the response should be text e.g., when you need to ask for clarification or if the prompt is not related to creating or updating a BPMN process and should be responded to with text

Existing process:
${JSON.stringify(bpmnJson)}`,
      userPrompt: prompt,
      model: 'gpt-4o-mini',
      response_format: zodResponseFormat(zod.object({
        action: zod.enum([
          'createBpmn',
          'updateBpmn',
          'fallback'
        ])
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

  async _updateBpmn(prompt, bpmnJson, selected) {
    const {
      changes,
      responseText
    } = await this._getCompletion({
      systemPrompt: getUpdateBpmnSystemPrompt(bpmnJson, selected),
      userPrompt: prompt,
      response_format: zodResponseFormat(updateBpmnSchema, "updateBpmnResponse")
    });

    return {
      changes,
      responseText
    };
  }

  async _fallback(prompt) {
    const { responseText } = await this._getCompletion({
      systemPrompt: `You are a BPMN expert that helps users with questions related to BPMN processes. Your response is
going to be shown directly to the user. Make sure to provide a helpful response. If the requirements given by the user
are unclear, ask for clarification. If you cannot provide a helpful response or the prompt is not related to BPMN
processes, reply in a way that indicates that. For example: "I'm sorry, I cannot provide a helpful response to this
question."`,
      userPrompt: prompt,
      response_format: zodResponseFormat(zod.object({
        responseText: zod.string()
      }), "responseText")
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
