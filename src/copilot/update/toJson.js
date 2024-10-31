export function toJson(definitions) {
  const { rootElements } = definitions;

  const process = rootElements.find((element) => element.$type === 'bpmn:Process');

  const { flowElements } = process;

  const elements = [];

  const addFlowElements = (flowElements) => {
    flowElements.forEach((element) => {
      const json = {
        type: element.$type,
        id: element.get('id'),
        parent: element.$parent.get('id')
      };

      if (element.get('name')) {
        json.name = element.get('name');
      }

      if (element.get('eventDefinitions') && element.get('eventDefinitions').length) {
        json.eventDefinitionType = element.get('eventDefinitions')[0].$type;
      }

      if (element.get('source')) {
        json.source = element.get('source').get('id');
      }

      if (element.get('target')) {
        json.target = element.get('target').get('id');
      }

      if (element.get('attachedToRef')) {
        json.attachedToRef = element.get('attachedToRef').get('id');
      }

      elements.push(json);

      if (element.get('flowElements')) {
        addFlowElements(element.get('flowElements'));
      }
    });
  };

  addFlowElements(flowElements);

  const processJson = {
    id: process.get('id'),
    elements
  };

  if (process.get('name')) {
    processJson.name = process.get('name');
  }

  return processJson;
}