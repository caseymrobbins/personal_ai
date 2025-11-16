/**
 * Transformers.js POC Component
 *
 * This component validates the required capabilities for:
 * 1. Guardian-Nano: Zero-shot classification for intent detection
 * 2. RDI (Reality Drift Index): Text embeddings for concept tracking
 *
 * Based on Section 1.1.3 and 4.2 of the specification
 */

import { useState } from 'react';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  data?: Record<string, unknown> | unknown[];
}

export function TransformersPOC() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (
    test: string,
    status: TestResult['status'],
    message?: string,
    data?: Record<string, unknown> | unknown[]
  ) => {
    setResults(prev => {
      const filtered = prev.filter(r => r.test !== test);
      return [...filtered, { test, status, message, data }];
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Dynamic import to avoid blocking initial load
      updateResult('import', 'pending', 'Dynamically importing Transformers.js...');

      const { pipeline } = await import('@xenova/transformers');

      updateResult('import', 'success', '✅ Transformers.js loaded');

      // Test 1: Zero-Shot Classification (Guardian-Nano)
      updateResult('classification', 'pending', 'Loading zero-shot classification model...');

      const classifier = await pipeline(
        'zero-shot-classification',
        'Xenova/mobilebert-uncased-mnli'
      );

      const text = 'I need help summarizing this document';
      const candidateLabels = ['simple_task', 'complex_task', 'sensitive_data'];

      updateResult('classification', 'pending', 'Running classification...');

      const classificationResult = await classifier(text, candidateLabels);

      updateResult(
        'classification',
        'success',
        '✅ Zero-shot classification working',
        classificationResult
      );

      // Test 2: Text Embeddings (RDI)
      updateResult('embeddings', 'pending', 'Loading embedding model...');

      const embedder = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );

      const sentences = [
        'I love working on AI projects',
        'Python programming is interesting',
        'The weather is nice today'
      ];

      updateResult('embeddings', 'pending', 'Generating embeddings...');

      const embeddings = await embedder(sentences, {
        pooling: 'mean',
        normalize: true,
      });

      updateResult(
        'embeddings',
        'success',
        `✅ Generated ${embeddings.data.length}-dim embeddings for ${sentences.length} sentences`,
        {
          sentences,
          embeddingShape: [sentences.length, embeddings.dims[1]],
          sample: Array.from(embeddings.data.slice(0, 5)),
        }
      );

      // Test 3: Performance Benchmark
      updateResult('benchmark', 'pending', 'Running performance benchmark...');

      const startTime = performance.now();
      await classifier('Quick test prompt', ['test1', 'test2']);
      const inferenceTime = performance.now() - startTime;

      updateResult(
        'benchmark',
        'success',
        `✅ Inference time: ${inferenceTime.toFixed(2)}ms`,
        { inferenceTime: `${inferenceTime.toFixed(2)}ms` }
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      updateResult('error', 'error', `❌ Error: ${errorMessage}`);
      console.error('[Transformers POC]', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🤖 Transformers.js POC (TASK-004)</h2>
      <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
        Testing zero-shot classification (Guardian-Nano) and embeddings (RDI)
      </p>

      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={runTests}
          disabled={isRunning}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.6 : 1,
          }}
        >
          {isRunning ? 'Running Tests...' : 'Run Transformers.js Tests'}
        </button>

        {isRunning && (
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>
            ⏱️ First run will download models (~50-100MB). This may take 30-60 seconds...
          </p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {results.map(result => (
          <div
            key={result.test}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid',
              borderColor:
                result.status === 'success' ? '#48bb78' :
                result.status === 'error' ? '#f56565' :
                '#667eea',
              backgroundColor:
                result.status === 'success' ? 'rgba(72, 187, 120, 0.1)' :
                result.status === 'error' ? 'rgba(245, 101, 101, 0.1)' :
                'rgba(102, 126, 234, 0.1)',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {result.test.toUpperCase()}
            </div>
            <div>{result.message}</div>
            {result.data && (
              <pre style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '4px',
                fontSize: '0.85rem',
                overflow: 'auto',
                maxHeight: '200px',
              }}>
                {String(JSON.stringify(result.data, null, 2))}
              </pre>
            )}
          </div>
        ))}
      </div>

      {results.length > 0 && results.every(r => r.status === 'success') && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(72, 187, 120, 0.1)',
          border: '1px solid #48bb78',
          borderRadius: '8px',
        }}>
          <h3 style={{ margin: 0, color: '#48bb78' }}>✅ TASK-004 Complete!</h3>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
            Transformers.js validated for Guardian-Nano and RDI
          </p>
        </div>
      )}
    </div>
  );
}
