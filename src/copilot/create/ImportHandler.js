/**
 * Command handler that imports a diagram while preserving the command stack.
 *
 * 1. Delete all elements from the diagram.
 * 2. Add all new elements to the diagram.
 */
export default class ImportHandler {
  constructor(commandStack) {
    this._commandStack = commandStack;
  }
}