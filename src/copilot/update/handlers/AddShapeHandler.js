import zod from 'zod';

export default class AddShapeHandler {
  constructor(bpmnjs) {
    this._bpmnjs = bpmnjs;
  }

  apply(change) {
    const {
      id,
      name,
      type,
      parent: parentId
    } = change;

    const elementRegistry = this._bpmnjs.get('elementRegistry');

    const parent = elementRegistry.get(parentId);

    if (!parent) {
      throw new Error(`Parent with ID ${id} not found.`);
    }

    const bpmnFactory = this._bpmnjs.get('bpmnFactory'),
          elementFactory = this._bpmnjs.get('elementFactory'),
          modeling = this._bpmnjs.get('modeling');

    const newBusinessObject = bpmnFactory.create(type, {
      id,
      name
    });

    const newElement = elementFactory.createShape({
      id,
      type,
      businessObject: newBusinessObject
    });

    const newElementMid = {
      x: 0,
      y: 0
    };

    modeling.createShape(newElement, newElementMid, parent);

    return {
      changed: [ newElement ],
      layout: [ newElement ]
    };
  }

  static id = 'addShape';

  static description = 'Add a new shape to the process.';

  static schema = zod.object({
    zodType: zod.literal(AddShapeHandler.id),
    id: zod.string().describe('ID of the shape to add'),
    type: zod.string().describe('Type of the shape to add'),
    name: zod.string().optional().describe('Name of the shape to add'),
    parent: zod.string().describe('ID of the parent shape')
  });
}