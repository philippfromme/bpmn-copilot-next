import zod from 'zod';

export default class ChangeNameHandler {
  constructor(bpmnjs) {
    this._bpmnjs = bpmnjs;
  }

  apply(change) {
    const { id, type } = change;

    const elementRegistry = this._bpmnjs.get('elementRegistry');

    const element = elementRegistry.get(id);

    if (!element) {
      return `Element with ID ${id} not found.`;
    }

    this._bpmnjs.get('bpmnReplace').replaceElement(element, { type });

    return [element];
  }

  static id = 'changeElementType';

  static description = 'Change the type of an element (e.g., from bpmn:Task to a bpmn:UserTask)';

  static schema = zod.object({
    zodType: zod.literal(ChangeNameHandler.id),
    id: zod.string().describe('ID of the element to change'),
    type: zod.string().describe('New type of the element')
  });
}