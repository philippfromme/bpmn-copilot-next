import zod from 'zod';

export default class AddConnectionHandler {
  constructor(bpmnjs) {
    this._bpmnjs = bpmnjs;
  }

  apply(change) {

    // TODO

    return [];
  }

  static id = 'addConnection';

  static description = `Add a new connection to the process.`;

  static schema = zod.object({
    zodType: zod.literal(AddConnectionHandler.id),
    id: zod.string().describe('ID of the connection to add'),
    type: zod.string().describe('Type of the connection to add'),
    name: zod.string().optional().describe('Name of the connection to add'),
    source: zod.string().describe('ID of the source shape'),
    target: zod.string().describe('ID of the target shape'),
    parent: zod.string().describe('ID of the parent shape')
  });
}