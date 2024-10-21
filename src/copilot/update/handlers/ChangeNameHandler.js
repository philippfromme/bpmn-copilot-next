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
      return `Element with ID ${id} not found.`;
    }

    this._bpmnjs.get('modeling').updateProperties(element, {
      name
    });

    return [element];
  }

  static id = 'changeName';

  static description = 'Change the name of an element';

  static schema = zod.object({
    zodType: zod.literal(ChangeNameHandler.id),
    id: zod.string().describe('ID of the element to change'),
    name: zod.string().describe('New name of the element')
  });
}