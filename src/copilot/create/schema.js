import zod from 'zod';

function prefix(types, prefix = 'bpmn') {
  return types.map(type => `${prefix}:${type}`);
}

const types = prefix([

  /**
   * Events
   */
  'BoundaryEvent',
  'EndEvent',
  'IntermediateCatchEvent',
  'IntermediateThrowEvent',
  'StartEvent',

  /**
   * Activities
   */
  'BusinessRuleTask',
  'ManualTask',
  'ReceiveTask',
  'Task',
  'ScriptTask',
  'SendTask',
  'ServiceTask',
  'UserTask',

  /**
   * Sub-processes
  */
  'CallActivity',
  'SubProcess',

  /**
   * Gateways
   */
  'EventBasedGateway',
  'ExclusiveGateway',
  'InclusiveGateway',
  'ParallelGateway',

  /**
   * Connections
   */
  'SequenceFlow'
]);

const eventDefinitionTypes = prefix([
  'CancelEventDefinition',
  'CompensateEventDefinition',
  'ConditionalEventDefinition',
  'ErrorEventDefinition',
  'LinkEventDefinition',
  'MessageEventDefinition',
  'SignalEventDefinition',
  'TimerEventDefinition',
]);

const activitySchema = zod.object({
  zodType: zod.literal('activity'),
  id: zod.string().describe('Unique identifier for the element'),
  name: zod.string().optional().describe('Name of the element'),
  type: zod.enum(types).describe('Type of the element'),
  parent: zod.string().describe('ID of parent element')
});

const connectionSchema = zod.object({
  zodType: zod.literal('connection'),
  id: zod.string().describe('Unique identifier for the element'),
  name: zod.string().optional().describe('Name of the element'),
  type: zod.enum(types).describe('Type of the element'),
  source: zod.string().optional().describe('ID of source element, used only for sequence flows'),
  target: zod.string().optional().describe('ID of target element, used only for sequence flows')
});

const gatewaySchema = zod.object({
  zodType: zod.literal('gateway'),
  id: zod.string().describe('Unique identifier for the element'),
  name: zod.string().optional().describe('Name of the element'),
  type: zod.enum(types).describe('Type of the element'),
  parent: zod.string().describe('ID of parent element')
});

const eventSchema = zod.object({
  zodType: zod.literal('event'),
  id: zod.string().describe('Unique identifier for the element'),
  name: zod.string().optional().describe('Name of the element'),
  type: zod.enum(types).describe('Type of the element'),
  parent: zod.string().describe('ID of parent element'),
  eventDefinitionType: zod.enum(eventDefinitionTypes).optional().describe('Event definition type')
});

const boundaryEventSchema = zod.object({
  zodType: zod.literal('boundaryEvent'),
  id: zod.string().describe('Unique identifier for the element'),
  name: zod.string().optional().describe('Name of the element'),
  type: zod.enum(types).describe('Type of the element'),
  parent: zod.string().describe('ID of parent element'),
  eventDefinitionType: zod.enum(eventDefinitionTypes).optional().describe('Event definition type'),
  attachedToRef: zod.string().optional().describe('ID of element that element is attached to, used only for boundary events')
});

export const processSchema = zod.object({
  name: zod.string().describe('Name of the process'),
  elements: zod.array(zod.discriminatedUnion('zodType', [
    activitySchema,
    connectionSchema,
    gatewaySchema,
    eventSchema,
    boundaryEventSchema
  ])).describe('List of elements in the process')
});

export const createBpmnSchema = zod.object({
  process: processSchema
});