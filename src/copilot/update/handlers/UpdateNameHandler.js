import zod from 'zod';

export default class ChangeNameHandler {
  constructor(bpmnjs) {
    this._bpmnjs = bpmnjs;
  }

  apply(change) {
    const { id, name } = change;

    const elementRegistry = this._bpmnjs.get('elementRegistry');

    const element = elementRegistry.get(id);

    if (!element) {
      throw new Error(`Element with ID ${id} not found.`);
    }

    this._bpmnjs.get('modeling').updateProperties(element, {
      name
    });

    return {
      changed: [ element ],
      layout: []
    };
  }

  static id = 'updateName';

  static description = 'Update the name of an element';

  static schema = zod.object({
    zodType: zod.literal(ChangeNameHandler.id),
    id: zod.string().describe('ID of the element to update'),
    name: zod.string().describe('New name of the element')
  });
}