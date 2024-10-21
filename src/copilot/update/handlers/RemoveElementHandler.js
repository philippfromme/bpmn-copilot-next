import zod from 'zod';

export default class RemoveElementHandler {
  constructor(bpmnjs) {
    this._bpmnjs = bpmnjs;
  }

  apply(change) {
    const { id } = change;

    const elementRegistry = this._bpmnjs.get('elementRegistry');

    const element = elementRegistry.get(id);

    if (!element) {
      throw new Error(`Element with ID ${id} not found.`);
    }

    this._bpmnjs.get('modeling').removeShape(element);

    return {
      changed: [],
      layout: []
    };
  }

  static id = 'removeElement';

  static description = 'Remove an element';

  static schema = zod.object({
    zodType: zod.literal(RemoveElementHandler.id),
    id: zod.string().describe('ID of the element to remove')
  });
}