import zod from 'zod';

export default class ReconnectConnectionHandler {
  constructor(bpmnjs) {
    this._bpmnjs = bpmnjs;
  }

  apply(change) {
    const {
      id,
      source,
      target
    } = change;

    const elementRegistry = this._bpmnjs.get('elementRegistry');

    const connection = elementRegistry.get(id);

    if (!connection) {
      throw new Error(`Connection with ID ${id} not found.`);
    }

    const sourceElement = elementRegistry.get(source),
          targetElement = elementRegistry.get(target);

    if (!sourceElement) {
      throw new Error(`Source with ID ${source} not found.`);
    }

    if (!targetElement) {
      throw new Error(`Target with ID ${target} not found.`);
    }

    this._bpmnjs.get('modeling').reconnect(connection, sourceElement, targetElement, {
      waypoints: connection.waypoints
    });

    return {
      changed: [ connection ],
      layout: []
    };
  }

  static id = 'reconnectConnection';

  static description = 'Reconnect an existing connection.';

  static schema = zod.object({
    zodType: zod.literal(ReconnectConnectionHandler.id),
    id: zod.string().describe('ID of the connection to reconnect'),
    source: zod.string().describe('ID of the new source shape'),
    target: zod.string().describe('ID of the new target shape')
  });
}