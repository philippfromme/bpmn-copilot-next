import bpmnIoPlugin from 'eslint-plugin-bpmn-io';

export default [
  ...bpmnIoPlugin.configs.browser.map((config) => ({
    ...config,
    files: ['src/**/*.js']
  })),
  ...bpmnIoPlugin.configs.jsx.map((config) => ({
    ...config,
    files: ['src/**/*.js']
  })),
  {
    languageOptions: {
      globals: {
        process: 'readonly'
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  }
]