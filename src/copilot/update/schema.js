import zod from 'zod';

import handlers from './handlers';

export const updateBpmnSchema = zod.object({
  changes: zod.array(zod.discriminatedUnion('zodType', handlers.map(handler => handler.schema))).describe('List of changes to apply to the process'),
});