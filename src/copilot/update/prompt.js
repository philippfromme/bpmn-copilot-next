import handlers from './handlers';

import {
  baseRules,
  formatInstructions
} from '../create/prompt.js';

export const baseInstructions = `You are a powerful BPMN copilot that applies changes to a BPMN process according to a description.
Analyse the provided description to understand the request.
Think step by step how to update the BPMN process.
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
${JSON.stringify(selected)}

Before answering, explain your reasoning step-by-step in <thinking> tags.
Use the <response> tags for a message that will be shown to the user. This message must not contain any information about the tool you use.

# Template:

<thinking></thinking>
<response></response>`;
};