import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

import { render } from 'react-dom';

import { Button, Heading, InlineLoading, TextInput } from '@carbon/react';

import { ChatBot, Close, ArrowUp, UserAvatar } from '@carbon/icons-react';

import classnames from 'classnames';

import { API } from './API';

import { fromJson } from './generator';

export default class Chat {
  constructor(bpmnjs, canvas) {
    const container = document.createElement('div');

    container.id = 'chatbot-container';

    canvas.getContainer().appendChild(container);

    const api = new API();

    render(<App api={ api } bpmnjs={ bpmnjs } />, container);
  }
}

Chat.$inject = [ 'bpmnjs', 'canvas' ];

function App({ api, bpmnjs }) {
  const [ messages, addMessage ] = useReducer(
    (state, message) => {
      return [ ...state, message ];
    },
    [
      {
        type: 'ai',
        text: "Hi, I'm your BPMN copilot. How can I help you?"
      },
    ]
  );

  const [ open, setOpen ] = useState(true);
  const [ prompting, setPrompting ] = useState(false);
  const [ value, setValue ] = useState('');

  const submitPrompt = useCallback(async () => {
    const prompt = value.trim();

    addMessage({ type: 'human', text: prompt });

    setValue('');

    setPrompting(true);

    let action;

    /**
     * 1. Decide what action to take based on the user prompt.
     */
    try {
      const response = await api.getAction(prompt);

      ({ action } = response);
    } catch (error) {
      console.log('error', error);

      addMessage({ type: 'ai', text: `Error: ${error.message}` });
    }

    if (!action) {
      addMessage({ type: 'ai', text: 'I could not understand your request. Please try again.' });

      setPrompting(false);

      return;
    }

    /**
     * 2. Perform the action.
     */
    if (action === 'createBpmn') {

      /**
       * 2.1. Create a new BPMN process.
       */
      try {
        const {
          bpmnJson,
          responseText
        } = await api.createBpmn(prompt);

        addMessage({
          type: 'ai',
          text: responseText
        });

        const xml = await fromJson(bpmnJson, bpmnjs);

        console.log('xml after layout', xml);

        await bpmnjs.importXML(xml);

        console.log('imported', bpmnjs.get('elementRegistry')._elements);

        bpmnjs.get('canvas').zoom('fit-viewport');
      } catch (error) {
        console.log('error', error);

        addMessage({ type: 'ai', text: `Error: ${error.message}` });
      }
    } else if (action === 'updateBpmn') {

      /**
       * 2.2. Update an existing BPMN process.
       */
      try {
        const {
          bpmnJson,
          responseText
        } = await api.updateBpmn(prompt);

        addMessage({
          type: 'ai',
          text: responseText
        });

        const xml = await fromJson(bpmnJson, bpmnjs);

        console.log('xml after layout', xml);

        await bpmnjs.importXML(xml);

        console.log('imported', bpmnjs.get('elementRegistry')._elements);

        bpmnjs.get('canvas').zoom('fit-viewport');
      } catch (error) {
        console.log('error', error);

        addMessage({ type: 'ai', text: `Error: ${error.message}` });
      }
    } else if (action === 'respondText') {

      /**
       * 2.3. Respond to a general question.
       */
      const responseText = await api.respondText(prompt);

      addMessage({
        type: 'ai',
        text: responseText
      });
    }

    setPrompting(false);
  }, [ addMessage, value ]);

  const onToggle = useCallback(() => {
    setOpen(!open);
  }, [ open ]);

  const onInput = useCallback(
    ({ target }) => {
      setValue(target.value);
    },
    [ setValue ]
  );

  const onKeyDown = useCallback(
    ({ code }) => {
      if (code === 'Enter' && value.length && !prompting) {
        submitPrompt();
      }
    },
    [ prompting, submitPrompt, value ]
  );

  const onSubmit = useCallback(() => {
    if (value.length && !prompting) {
      submitPrompt();
    }
  }, [ prompting, submitPrompt, value ]);

  const ref = useRef();

  useEffect(() => {
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [ messages ]);

  return (
    <>
      {open ? (
        <div className="chatbot djs-scrollable">
          <div className="chatbot-header">
            <Heading>Copilot</Heading>
            <Button hasIconOnly onClick={ onToggle } kind="ghost" label="Close">
              <Close />
            </Button>
          </div>
          <div ref={ ref } className="chatbot-messages">
            {messages.map((message, index) => (
              <Message key={ index } type={ message.type }>
                {message.text}
              </Message>
            ))}
            {prompting && (
              <Message type="ai">
                <InlineLoading />
              </Message>
            )}
          </div>
          <div className="chatbot-input">
            <TextInput
              id="chatbot-input"
              labelText="Describe the process..."
              hideLabel={ true }
              placeholder="Describe the process..."
              onInput={ onInput }
              onKeyDown={ onKeyDown }
              value={ value }
            />
            <Button
              hasIconOnly
              disabled={ prompting || !value.length }
              onClick={ onSubmit }
              label="Submit"
            >
              <ArrowUp />
            </Button>
          </div>
        </div>
      ) : (
        <Button className="chatbot-toggle" hasIconOnly onClick={ onToggle } label="Open">
          <ChatBot />
        </Button>
      )}
    </>
  );
}

function Message(props) {
  const { children, type } = props;

  return (
    <div
      className={ classnames('chatbot-message', {
        'chatbot-message-ai': type === 'ai',
        'chatbot-message-human': type === 'human',
      }) }
    >
      <div className="chatbot-message-avatar">
        {type === 'ai' ? <ChatBot /> : <UserAvatar />}
      </div>
      <div className="chatbot-message-bubble">{children}</div>
    </div>
  );
}