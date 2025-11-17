/**
 * Test Fixtures for Import Service
 *
 * Sample export data from ChatGPT and Claude
 */

export const chatGPTExportSample = {
  title: 'Test Conversation',
  create_time: 1704067200, // 2024-01-01 00:00:00
  update_time: 1704070800, // 2024-01-01 01:00:00
  mapping: {
    'root': {
      id: 'root',
      parent: null,
      children: ['msg-1'],
    },
    'msg-1': {
      id: 'msg-1',
      message: {
        id: 'msg-1',
        author: {
          role: 'user',
        },
        content: {
          content_type: 'text',
          parts: ['Hello, how are you?'],
        },
        create_time: 1704067200,
      },
      parent: 'root',
      children: ['msg-2'],
    },
    'msg-2': {
      id: 'msg-2',
      message: {
        id: 'msg-2',
        author: {
          role: 'assistant',
        },
        content: {
          content_type: 'text',
          parts: ["I'm doing well, thank you! How can I help you today?"],
        },
        create_time: 1704067210,
      },
      parent: 'msg-1',
      children: [],
    },
  },
};

export const chatGPTExportMultiple = [
  chatGPTExportSample,
  {
    title: 'Second Conversation',
    create_time: 1704153600,
    update_time: 1704157200,
    mapping: {
      'root': {
        id: 'root',
        children: ['msg-3'],
      },
      'msg-3': {
        id: 'msg-3',
        message: {
          id: 'msg-3',
          author: {
            role: 'user',
          },
          content: {
            content_type: 'text',
            parts: ['What is TypeScript?'],
          },
          create_time: 1704153600,
        },
        parent: 'root',
        children: [],
      },
    },
  },
];

export const claudeExportSample = {
  uuid: 'conv-uuid-123',
  name: 'Test Claude Conversation',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T01:00:00Z',
  chat_messages: [
    {
      uuid: 'msg-uuid-1',
      text: 'Hello Claude!',
      sender: 'human',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      uuid: 'msg-uuid-2',
      text: 'Hello! How can I assist you today?',
      sender: 'assistant',
      created_at: '2024-01-01T00:00:10Z',
      updated_at: '2024-01-01T00:00:10Z',
    },
  ],
};

export const claudeExportMultiple = [
  claudeExportSample,
  {
    uuid: 'conv-uuid-456',
    name: 'Another Conversation',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T01:00:00Z',
    chat_messages: [
      {
        uuid: 'msg-uuid-3',
        text: 'Explain React hooks',
        sender: 'human',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      },
    ],
  },
];

export const invalidJSON = '{ invalid json }';

export const unknownFormat = {
  some: 'data',
  that: 'doesnt',
  match: 'any format',
};
