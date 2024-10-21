import zod from 'zod';

import { getConnectionMid, getMid } from 'diagram-js/lib/layout/LayoutUtil';

export default class ChangeNameHandler {
  constructor(bpmnjs) {
    this._bpmnjs = bpmnjs;
  }

  apply(change) {
    const {
      id,
      name,
      type,
      connection: connectionId,
      parent: parentId
    } = change;

    const elementRegistry = this._bpmnjs.get('elementRegistry');

    const connection = elementRegistry.get(connectionId);

    if (!connection) {
      return `Connection with ID ${id} not found.`;
    }

    const parent = elementRegistry.get(parentId);

    if (!parent) {
      return `Parent with ID ${id} not found.`;
    }

    // TODO
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

    const connectionMid = getConnectionMid(connection);

    const newElementMid = {
      x: connectionMid.x,
      y: connectionMid.y
    };

    modeling.createShape(newElement, newElementMid, parent);

    const oldTarget = connection.target;

    modeling.reconnectEnd(connection, newElement, getMid(newElement));

    const newConnection = modeling.connect(newElement, oldTarget, {
      type: connection.type
    });

    return [
      newElement,
      connection,
      newConnection
    ];
  }

  static id = 'insertElement';

  static description = `Insert new element between two existing elements (e.g.,
a new task between two existing tasks). Only works if single element is to be
inserted between two connected elements.`;

  static schema = zod.object({
    zodType: zod.literal(ChangeNameHandler.id),
    id: zod.string().describe('ID of the element to insert'),
    type: zod.string().describe('Type of the element to insert'),
    name: zod.string().optional().describe('Name of the element to insert'),
    connection: zod.string().describe('ID of the connection to insert the element into'),
    parent: zod.string().describe('ID of the parent element')
  });
}