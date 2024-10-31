import { isArray } from 'min-dash';

import { layoutProcess } from 'bpmn-auto-layout';

export default async function fromJson(json, bpmnjs) {
  let counter = 0;

  const moddle = bpmnjs.get('moddle');

  function createModdleElement(type, properties) {
    const moddleElement = moddle.create(type, properties);

    const isReference = (propertyName, moddleElement) => {
      const { $descriptor } = moddleElement;

      const { propertiesByName } = $descriptor;

      const property = propertiesByName[propertyName];

      return property.isReference;
    };

    const setParent = (property) => {
      if (property && property.$type) {
        const childModdleElement = property;

        childModdleElement.$parent = moddleElement;
      }
    };

    if (properties) {
      Object.entries(properties).forEach(([ propertyName, property ]) => {
        if (isReference(propertyName, moddleElement)) {
          return;
        }

        setParent(property);

        if (isArray(property)) {
          property.forEach(setParent);
        }
      });
    }

    return moddleElement;
  }

  const definitions = createModdleElement('bpmn:Definitions', {
    id: 'Definitions_1',
    rootElements: []
  });

  const process = createModdleElement('bpmn:Process', {
    id: 'Process_1',
    flowElements: []
  });

  definitions.rootElements.push(process);

  process.$parent = definitions;

  const { elements } = json;

  console.log('elements', elements);

  const elementsById = {
    'Process_1': process
  };

  while (elements.length && counter < 100) {
    console.log(elements.length, 'elements left');

    counter++;

    const element = elements.shift();

    console.log('element', element);

    if ([
      'activity',
      'boundaryEvent',
      'event',
      'gateway'
    ].includes(element.zodType)) {
      const parent = elementsById[ element.parent ];

      if (!parent) {
        console.log('parent', element.parent, 'not found, continuing');

        elements.push(element);

        continue;
      }

      let host;

      if (element.zodType === 'boundaryEvent') {
        host = elementsById[ element.attachedToRef ];

        if (!host) {
          console.log('host', element.attachedToRef, 'not found, continuing');

          elements.push(element);

          continue;
        }
      }

      const properties = {
        id: element.id,
        name: element.name
      };

      const moddleElement = createModdleElement(element.type, properties);

      if (element.zodType === 'event' && element.eventDefinitionType) {
        const eventDefinition = createModdleElement(element.eventDefinitionType);

        moddleElement.set('eventDefinitions', [ eventDefinition ]);

        eventDefinition.$parent = moddleElement;
      }

      elementsById[ element.id ] = moddleElement;

      parent.flowElements.push(moddleElement);

      moddleElement.$parent = parent;

      if (host) {
        moddleElement.attachedToRef = host;

        if (!host.attachers) {
          host.attachers = [];
        }

        host.attachers.push(moddleElement);
      }
    } else if (element.zodType === 'connection') {
      const source = elementsById[ element.source ],
            target = elementsById[ element.target ];

      if (!source || !target) {
        !source && console.log('source', element.source, 'not found, continuing');
        !target && console.log('target', element.target, 'not found, continuing');

        elements.push(element);

        continue;
      }

      const moddleElement = createModdleElement('bpmn:SequenceFlow', {
        id: element.id,
        name: element.name,
        sourceRef: source,
        targetRef: target
      });

      if (!source.outgoing) {
        source.outgoing = [];
      }

      source.outgoing.push(moddleElement);

      if (!target.incoming) {
        target.incoming = [];
      }

      target.incoming.push(moddleElement);

      const parent = source.$parent;

      parent.flowElements.push(moddleElement);

      moddleElement.$parent = parent;
    }
  }

  if (counter === 1000) {
    throw new Error('Hit counter limit');
  }

  const { xml } = await moddle.toXML(definitions);

  console.log('xml before layout', xml);

  return layoutProcess(xml);
}
