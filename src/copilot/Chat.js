import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';

import { render } from 'react-dom';

import {
  Button,
  Heading,
  InlineLoading,
  TextArea,
  Tile
} from '@carbon/react';

import { ChatBot, Close, ArrowRight, UserAvatar } from '@carbon/icons-react';

import Markdown from 'react-markdown';

import classnames from 'classnames';

import Copilot from './Copilot';

const EXAMPLE_PROMPTS = [
  'Create a hiring process for an insurance company',
  'Change the process to update the CMS record manually',
  'Require a manager approval before granting access to the platform',
  'Explain what a subprocess is',
  'How do I buy bitcoins?'
];

export default class Chat {
  constructor(bpmnjs, canvas, eventBus) {
    const container = document.createElement('div');

    container.id = 'chatbot-container';

    canvas.getContainer().appendChild(container);

    const copilot = new Copilot(bpmnjs);

    eventBus.on('diagram.init', () => {
      render(<ChatComponent copilot={ copilot } bpmnjs={ bpmnjs } />, container);
    });
  }
}

Chat.$inject = [ 'bpmnjs', 'canvas', 'eventBus' ];

function ChatComponent({ copilot, bpmnjs }) {
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

  const isPromptingRef = useRef(false);

  const [ open, setOpen ] = useState(true);
  const [ value, setValue ] = useState('');
  const [ isPrompting, setIsPrompting ] = useState(false);
  const [ hasSelection, setHasSelection ] = useState(false);
  const [ selectionLength, setSelectionLength ] = useState(0);
  const [ selectedElementName, setSelectedElementName ] = useState(null);
  const [ examplePromptsVisible, setExamplePromptsVisible ] = useState(true);
  const [ loadingMessage, setLoadingMessage ] = useState(null);

  bpmnjs.on('selection.changed', ({ newSelection }) => {
    setHasSelection(newSelection.length > 0);
    setSelectionLength(newSelection.length);

    if (newSelection.length === 1) {
      const [ element ] = newSelection;

      if (element.businessObject.name) {
        setSelectedElementName(element.businessObject.name);
      } else {
        setSelectedElementName(null);
      }
    } else {
      setSelectedElementName(null);
    }
  });

  const submitPrompt = useCallback(async (_value) => {
    setLoadingMessage('Thinking...');

    const prompt = _value || value.trim();

    addMessage({ type: 'human', text: prompt });

    setExamplePromptsVisible(false);

    setValue('');

    isPromptingRef.current = true;
    setIsPrompting(true);

    const response = await copilot.submitPrompt(prompt, setLoadingMessage);

    addMessage({ type: 'ai', text: response });

    isPromptingRef.current = false;

    setLoadingMessage(null);

    setIsPrompting(false);
  }, [ addMessage, value ]);

  const onToggle = useCallback(() => {
    setOpen(!open);
  }, [ open ]);

  const onInput = useCallback(
    ({ target }) => {
      if (isPromptingRef.current) {
        return;
      }

      setValue(target.value);
    },
    [ setValue ]
  );

  const onKeyDown = useCallback(
    ({ code, ctrlKey }) => {
      if (code === 'Enter' && ctrlKey && value.length && !isPromptingRef.current) {
        setValue((value) => `${value}\n`);

        return;
      }

      if (code === 'Enter' && value.length && !isPromptingRef.current) {
        submitPrompt();
      }
    },
    [ submitPrompt, value ]
  );

  const onSubmit = useCallback(() => {
    if (!value.trim().length || isPromptingRef.current) {
      return;
    }

    if (value.length && !isPromptingRef.current) {
      submitPrompt();
    }
  }, [ submitPrompt, value ]);

  const ref = useRef();

  useEffect(() => {
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [ messages ]);

  const inputRef = useRef();

  useEffect(() => {
    setTimeout(() => {
      inputRef.current.focus();
    }, 0);
  }, []);

  useLayoutEffect(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
  }, [ value ]);

  return (
    <>
      {open ? (
        <div className="chatbot djs-scrollable">
          <div className="chatbot-header">
            <Heading>Copilot</Heading>
            <Button hasIconOnly onClick={ onToggle } kind="ghost" label="Close" iconDescription="Close">
              <Close />
            </Button>
          </div>
          <div ref={ ref } className="chatbot-messages">
            {messages.map((message, index) => (
              <Message key={ index } type={ message.type }>
                <Markdown>{message.text}</Markdown>
              </Message>
            ))}
            {isPrompting && (
              <Message type="ai">
                <span className="chatbot-message-loading"><InlineLoading />{loadingMessage}</span>
              </Message>
            )}
          </div>
          {
            messages.length === 1 && examplePromptsVisible && (
              <div className="chatbot-examples">
                <div className="chatbot-examples-header">
                  <h2>Examples</h2>
                  <Button
                    onClick={ () => setExamplePromptsVisible(false) }
                    kind="ghost"
                    hasIconOnly
                    renderIcon={ Close }
                    iconDescription="Close"
                    label="Close"
                    className="chatbot-close-examples"
                  ></Button>
                </div>
                {
                  EXAMPLE_PROMPTS.map((prompt, index) => {
                    return (
                      <Tile
                        key={ index }
                        className="chatbot-example"
                        onClick={ () => submitPrompt(prompt) }
                      >
                        { prompt }
                        <ArrowRight />
                      </Tile>
                    );
                  })
                }
              </div>
            )
          }
          <div className="chatbot-input">
            <TextArea
              placeholder="Ask Copilot"
              rows={ 1 }
              ref={ inputRef }
              id="chatbot-input"
              labelText=""
              hideLabel={ true }
              onInput={ onInput }
              onKeyDown={ onKeyDown }
              value={ value }
              spellCheck={ false }
            />
            <div className="chatbot-input-controls">
              {
                hasSelection && (
                  <div className="chatbot-input-controls-left">
                    <Button
                      className="chatbot-clear-selection"
                      renderIcon={ Close }
                      iconDescription="Close"
                      label="Close"
                      kind="ghost"
                      onClick={ () => bpmnjs.get('selection').select(null) }>
                      {
                        selectedElementName
                          ? <span><i>{ shorten(selectedElementName) }</i> selected</span>
                          : <span>{ selectionLength } { selectionLength === 1 ? 'element' : 'elements' } selected</span>
                      }
                    </Button>
                  </div>
                )
              }
              <div className="chatbot-input-controls-right">
                <Button
                  className="chatbot-submit"
                  hasIconOnly
                  onClick={ onSubmit }
                  label="Submit"
                  kind="ghost"
                  renderIcon={ ArrowRight }
                  iconDescription="Submit"
                >
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Button className="chatbot-toggle" hasIconOnly onClick={ onToggle } label="Open" iconDescription="Open">
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

const MAX_LENGTH = 15;

function shorten(text) {
  if (text.length > MAX_LENGTH) {
    return text.slice(0, MAX_LENGTH) + '...';
  }

  return text;
}