import handlers from './handlers';

import {
  baseRules,
  formatInstructions
} from '../create/prompt.js';

import Mustache from 'mustache';

Mustache.escape = text => text;

export const baseInstructions = `You are a powerful BPMN copilot that applies changes to a BPMN process according to a description.
Analyse the provided description and use the \`thinking\` field to understand the changes that need to be made to the process.
The following changes can be applied to the process:

${handlers.map(handler => `- ${handler.description}`).join('\n')}`;

export function getSystemPrompt(history, bpmnJson, selected) {
  return `${baseInstructions}
${baseRules}
${formatInstructions}

# Chat history so far (limited to the last 5 messages):
${history.slice(-5).map(({ role, content }) => `- ${role}: ${content}`).join('\n')}

# Existing process:
${JSON.stringify(bpmnJson)}

# Elements selected by user:
${JSON.stringify(selected)}`;
};