import React, { useEffect, useState } from 'react';

import { render } from 'react-dom';

import { Button } from '@carbon/react';

import { Redo, Undo } from '@carbon/icons-react';

export default class UndoRedo {
  constructor(canvas, commandStack, eventBus) {
    const container = document.createElement('div');

    container.id = 'undo-redo';

    canvas.getContainer().appendChild(container);

    eventBus.on('diagram.init', () => {
      render(<UndoRedoComponent commandStack={ commandStack } eventBus={ eventBus } />, container);
    });
  }
}

UndoRedo.$inject = [ 'canvas', 'commandStack', 'eventBus' ];

function UndoRedoComponent({ commandStack, eventBus }) {
  const [ canUndo, setCanUndo ] = useState(commandStack.canUndo());
  const [ canRedo, setCanRedo ] = useState(commandStack.canRedo());

  const onRedo = () => {
    commandStack.redo();
  };

  const onUndo = () => {
    commandStack.undo();
  };

  useEffect(() => {
    eventBus.on('commandStack.changed', () => {
      setCanUndo(commandStack.canUndo());
      setCanRedo(commandStack.canRedo());
    });
  }, [ commandStack, eventBus ]);

  return (
    <div className="undo-redo">
      <Button
        kind="ghost"
        hasIconOnly
        disabled={ !canUndo }
        onClick={ onUndo }
        renderIcon={ Undo }
        iconDescription="Undo"
      >
      </Button>
      <Button
        kind="ghost"
        hasIconOnly
        disabled={ !canRedo }
        onClick={ onRedo }
        renderIcon={ Redo }
        iconDescription="Redo"
      >
      </Button>
    </div>
  );
}