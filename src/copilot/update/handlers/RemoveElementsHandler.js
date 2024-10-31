import zod from 'zod';

export default class RemoveElementsHandler {
  constructor(bpmnjs) {
    this._bpmnjs = bpmnjs;
  }

  apply(change) {
    const { ids } = change;

    const elementRegistry = this._bpmnjs.get('elementRegistry');

    const elements = ids.map(id => elementRegistry.get(id));

    if (!elements.every(element => element)) {
      throw new Error('One or more elements not found.');
    }

    this._bpmnjs.get('modeling').removeElements(elements);

    return {
      changed: [],
      layout: []
    };
  }

  static id = 'removeElements';

  static description = 'Remove on or many elements';

  static schema = zod.object({
    zodType: zod.literal(RemoveElementsHandler.id),
    ids: zod.array(zod.string()).describe('IDs of the elements to remove')
  });
}