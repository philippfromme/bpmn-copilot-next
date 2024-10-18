import Modeler from 'bpmn-js/lib/Modeler';

import { CreateAppendAnythingModule } from 'bpmn-js-create-append-anything';
import { BpmnImprovedCanvasModule } from '@camunda/improved-canvas';

import fileDrop from 'file-drops';

import ChatbotModule from './chatbot';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';

import './styles.scss';

import diagram from './diagram.bpmn';

const container = document.getElementById('container');

const modeler = new Modeler({
  container,
  additionalModules: [ ChatbotModule, CreateAppendAnythingModule, BpmnImprovedCanvasModule ],
  keyboard: {
    bindTo: document,
  },
  resourceLinking: false
});

modeler
  .importXML(diagram)
  .then(({ warnings }) => {
    if (warnings.length) {
      console.log(warnings);
    }

    const canvas = modeler.get('canvas');

    canvas.zoom('fit-viewport');
  })
  .catch((err) => {
    console.log(err);
  });

document.body.addEventListener('dragover', fileDrop('Drop a file', async (files) => {
  const [ file ] = files;

  const { contents } = file;

  modeler.importXML(contents);
}));