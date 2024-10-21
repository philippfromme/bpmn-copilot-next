import zod from 'zod';

export default class AddConnectionHandler {
  constructor(bpmnjs) {
    this._bpmnjs = bpmnjs;
  }

  apply(change) {
    const {
      id,
      type,
      name,
      source,
      target,
      parent
    } = change;

    const elementRegistry = this._bpmnjs.get('elementRegistry');

    const sourceElement = elementRegistry.get(source),
          targetElement = elementRegistry.get(target);

    if (!sourceElement) {
      throw new Error(`Source with ID ${source} not found.`);
    }

    if (!targetElement) {
      throw new Error(`Target with ID ${target} not found.`);
    }

    const newConnection = this._bpmnjs.get('modeling').connect(sourceElement, targetElement, {
      type,
      businessObject: this._bpmnjs.get('bpmnFactory').create(type, {
        id,
        name
      })
    });

    return {
      changed: [newConnection],
      layout: []
    };
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