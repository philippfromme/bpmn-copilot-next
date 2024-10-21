import handlers from './handlers';

import {
  baseRules,
  formatInstructions
} from '../create/prompt.js';

import Mustache from 'mustache';

Mustache.escape = text => text;

export const baseInstructions = `You are a powerful BPMN copilot that applies changes to a BPMN process according to a description.
Analyse the provided description and use the \`description\` field to understand the changes that need to be made to the process.
The following changes can be applied to the process:

${handlers.map(handler => `- ${handler.description}`).join('\n')}`;

export function getSystemPrompt(bpmnJson) {
  return Mustache.render(`{{baseInstructions}}
{{baseRules}}
{{formatInstructions}}
Process to apply changes to:
{{bpmnJson}}`, {
    baseInstructions,
    baseRules,
    formatInstructions,
    bpmnJson: JSON.stringify(bpmnJson)
  });
};