import './App.css'
import { ChatLayout, DatabasePOC, TransformersPOC, WebLLMPOC, ChatContainer } from './components'
import { useState } from 'react'
import { useChatState, ModuleState } from './store/chat.store'

type Tab = 'chat' | 'database' | 'transformers' | 'webllm';

function App() {
  const { setModuleState } = useChatState()
  const [activeTab, setActiveTab] = useState<Tab>('chat')

  // Demo: Simulate different module states
  const simulateStateTransition = () => {
    const states: Array<{ state: ModuleState; provider?: string; duration: number }> = [
      { state: 'LOCAL_ROUTING', duration: 1000 },
      { state: 'SCRUBBING', duration: 1500 },
      { state: 'EXTERNAL_API', provider: 'OpenAI', duration: 2000 },
      { state: 'UNSCRUBBING', duration: 1000 },
      { state: 'IDLE', duration: 0 },
    ]

    let delay = 0
    states.forEach(({ state, provider, duration }) => {
      setTimeout(() => setModuleState(state, provider), delay)
      delay += duration
    })
  }

  return (
    <ChatLayout>
      <div className="app-content">
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: activeTab === 'chat' ? '#667eea' : '#4a5568',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: activeTab === 'chat' ? '600' : '400',
            }}
          >
            💬 Chat
          </button>
          <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.2)', margin: '0 0.5rem' }} />
          <button
            onClick={() => setActiveTab('database')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              backgroundColor: activeTab === 'database' ? '#9f7aea' : '#4a5568',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            💾 DB POC
          </button>
          <button
            onClick={() => setActiveTab('transformers')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              backgroundColor: activeTab === 'transformers' ? '#9f7aea' : '#4a5568',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            🤖 TF POC
          </button>
          <button
            onClick={() => setActiveTab('webllm')}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              backgroundColor: activeTab === 'webllm' ? '#9f7aea' : '#4a5568',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            🚀 LLM POC
          </button>
          {activeTab !== 'chat' && (
            <button
              onClick={simulateStateTransition}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem',
                backgroundColor: '#f6ad55',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginLeft: 'auto',
              }}
            >
              🎬 Demo States
            </button>
          )}
        </div>

        {activeTab === 'chat' && <ChatContainer />}
        {activeTab === 'database' && <DatabasePOC />}
        {activeTab === 'transformers' && <TransformersPOC />}
        {activeTab === 'webllm' && <WebLLMPOC />}
      </div>
    </ChatLayout>
  )
}

export default App
