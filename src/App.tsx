import './App.css'
import { ChatLayout, DatabasePOC, TransformersPOC, WebLLMPOC } from './components'
import { useState } from 'react'
import { useChatState, ModuleState } from './store/chat.store'

type POCTab = 'database' | 'transformers' | 'webllm';

function App() {
  const { setModuleState } = useChatState()
  const [showPOC, setShowPOC] = useState(true)
  const [activeTab, setActiveTab] = useState<POCTab>('database')

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
        {showPOC ? (
          <>
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={simulateStateTransition}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                🎬 Demo Module States
              </button>
              <button
                onClick={() => setActiveTab('database')}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: activeTab === 'database' ? '#9f7aea' : '#4a5568',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                💾 Database POC
              </button>
              <button
                onClick={() => setActiveTab('transformers')}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: activeTab === 'transformers' ? '#9f7aea' : '#4a5568',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                🤖 Transformers POC
              </button>
              <button
                onClick={() => setActiveTab('webllm')}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: activeTab === 'webllm' ? '#9f7aea' : '#4a5568',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                🚀 WebLLM POC
              </button>
              <button
                onClick={() => setShowPOC(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: '#48bb78',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Hide POC Tests
              </button>
            </div>

            {activeTab === 'database' && <DatabasePOC />}
            {activeTab === 'transformers' && <TransformersPOC />}
            {activeTab === 'webllm' && <WebLLMPOC />}
          </>
        ) : (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
          }}>
            <h2>✅ Sprint 0 Foundation Complete</h2>
            <p style={{ marginTop: '1rem', opacity: 0.8 }}>
              Core technologies validated and ready for Sprint 1
            </p>
            <button
              onClick={() => setShowPOC(true)}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Show POC Tests
            </button>
          </div>
        )}
      </div>
    </ChatLayout>
  )
}

export default App
