import zod from 'zod';

import handlers from './handlers';

export const updateBpmnSchema = zod.object({
  description: zod.string().describe('Detailed description of the changes to be applied to the process'),
  changes: zod.array(zod.discriminatedUnion('zodType', handlers.map(handler => handler.schema))).describe('List of changes to apply to the process'),
  responseText: zod.string().describe('Response text that will be shown to the user after the changes have been applied')
});