import zod from 'zod';

import handlers from './handlers';

export const updateBpmnSchema = zod.object({
  thinking: zod.string().describe('Your thought process behind the changes you are going to make'),
  changes: zod.array(zod.discriminatedUnion('zodType', handlers.map(handler => handler.schema))).describe('List of changes to apply to the process'),
  responseText: zod.string().describe('Response text that will be shown to the user after the changes have been applied')
});