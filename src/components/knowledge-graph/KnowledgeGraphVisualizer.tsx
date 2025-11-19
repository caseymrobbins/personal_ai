/**
 * Knowledge Graph Visualizer Component
 *
 * Displays knowledge extracted from conversations as interactive semantic network:
 * - Canvas-based rendering for performance
 * - Force simulation for concept positioning
 * - Interactive zoom, pan, and node selection
 * - Concept filtering and search
 * - Relationship type visualization
 * - Concept statistics and details panel
 */

import { useEffect, useRef, useState } from 'react';
import { knowledgeGraphService, type KnowledgeGraph } from '../../services/knowledge-graph.service';
import './KnowledgeGraphVisualizer.css';

export interface KnowledgeGraphVisualizerProps {
  conversationId: string;
  isOpen: boolean;
  onClose?: () => void;
}

interface SimulationConcept {
  id: string;
  label: string;
  type: 'entity' | 'topic' | 'technique' | 'question' | 'problem';
  frequency: number;
  importance: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface SimulationRelationship {
  source: SimulationConcept;
  target: SimulationConcept;
  type: 'co-occurrence' | 'definition' | 'example' | 'causation' | 'analogy';
  strength: number;
}

export function KnowledgeGraphVisualizer({ conversationId, isOpen, onClose }: KnowledgeGraphVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<SimulationConcept | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [filterType, setFilterType] = useState<'all' | 'entity' | 'topic' | 'technique' | 'question' | 'problem'>('all');
  const simulationConceptsRef = useRef<SimulationConcept[]>([]);
  const simulationRelationshipsRef = useRef<SimulationRelationship[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Build graph on mount
  useEffect(() => {
    if (!isOpen) return;

    try {
      const kg = knowledgeGraphService.extractConversationGraph(conversationId);
      setGraph(kg);

      if (kg.concepts.length > 0) {
        initializeSimulation(kg);
        setIsSimulating(true);
      }
    } catch (err) {
      console.error('Failed to extract knowledge graph:', err);
    }
  }, [conversationId, isOpen]);

  // Animation loop
  useEffect(() => {
    if (!isSimulating || !canvasRef.current || !graph) return;

    const animate = () => {
      updateSimulation();
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSimulating, zoom, pan, graph]);

  /**
   * Initialize force-directed simulation
   */
  const initializeSimulation = (kg: KnowledgeGraph) => {
    const simConcepts: SimulationConcept[] = kg.concepts.map((concept) => ({
      ...concept,
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
      vx: 0,
      vy: 0,
      radius: Math.sqrt(concept.importance) * 20 + 5,
      color: this.getConceptColor(concept.type, concept.importance),
    }));

    const conceptMap = new Map(simConcepts.map((c) => [c.id, c]));
    const simRelationships: SimulationRelationship[] = kg.relationships
      .map((rel) => {
        const source = conceptMap.get(rel.sourceConceptId);
        const target = conceptMap.get(rel.targetConceptId);
        return source && target ? { source, target, type: rel.type, strength: rel.strength } : null;
      })
      .filter((r): r is SimulationRelationship => r !== null);

    simulationConceptsRef.current = simConcepts;
    simulationRelationshipsRef.current = simRelationships;
  };

  /**
   * Get color for concept type and importance
   */
  private getConceptColor(type: string, importance: number): string {
    const typeColors: Record<string, string> = {
      entity: '#667eea',
      topic: '#764ba2',
      technique: '#f093fb',
      question: '#f5576c',
      problem: '#e74c3c',
    };

    const baseColor = typeColors[type] || '#667eea';

    // Could apply importance-based alpha variation here
    return baseColor;
  }

  /**
   * Update force simulation
   */
  const updateSimulation = () => {
    const concepts = simulationConceptsRef.current;
    const relationships = simulationRelationshipsRef.current;
    const k = 50; // Spring strength
    const damping = 0.99;
    const repulsion = 15000;

    // Apply repulsive forces
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const dx = concepts[j].x - concepts[i].x;
        const dy = concepts[j].y - concepts[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (distance * distance);

        concepts[i].vx -= (force * dx) / distance;
        concepts[i].vy -= (force * dy) / distance;
        concepts[j].vx += (force * dx) / distance;
        concepts[j].vy += (force * dy) / distance;
      }
    }

    // Apply attractive forces along links
    relationships.forEach((rel) => {
      const dx = rel.target.x - rel.source.x;
      const dy = rel.target.y - rel.source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = ((distance - k) * rel.strength) / distance;

      rel.source.vx += (force * dx) / 50;
      rel.source.vy += (force * dy) / 50;
      rel.target.vx -= (force * dx) / 50;
      rel.target.vy -= (force * dy) / 50;
    });

    // Update positions
    concepts.forEach((concept) => {
      concept.vx *= damping;
      concept.vy *= damping;
      concept.x += concept.vx;
      concept.y += concept.vy;
    });
  };

  /**
   * Render graph to canvas
   */
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const concepts = simulationConceptsRef.current;
    const relationships = simulationRelationshipsRef.current;

    // Clear canvas
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.save();
    ctx.translate(centerX + pan.x, centerY + pan.y);
    ctx.scale(zoom, zoom);

    // Draw relationship types as different styled lines
    const relationshipStyles: Record<string, { color: string; dash: number[] }> = {
      'co-occurrence': { color: 'rgba(255, 255, 255, 0.2)', dash: [5, 5] },
      definition: { color: 'rgba(102, 126, 234, 0.3)', dash: [] },
      example: { color: 'rgba(240, 147, 251, 0.25)', dash: [2, 3] },
      causation: { color: 'rgba(245, 87, 108, 0.35)', dash: [3, 2] },
      analogy: { color: 'rgba(118, 75, 162, 0.3)', dash: [4, 4] },
    };

    relationships.forEach((rel) => {
      const x1 = rel.source.x;
      const y1 = rel.source.y;
      const x2 = rel.target.x;
      const y2 = rel.target.y;

      const style = relationshipStyles[rel.type] || relationshipStyles['co-occurrence'];
      ctx.strokeStyle = style.color;
      ctx.lineWidth = Math.max(0.5, rel.strength * 2);
      ctx.setLineDash(style.dash);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Draw concepts
    concepts.forEach((concept) => {
      const isSelected = selectedConcept?.id === concept.id;
      const matchesSearch = searchQuery === '' || concept.label.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || concept.type === filterType;
      const isVisible = matchesSearch && matchesType;

      if (!isVisible) {
        // Draw dimmed
        ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
        ctx.beginPath();
        ctx.arc(concept.x, concept.y, concept.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Draw normal
        ctx.fillStyle = concept.color;
        ctx.beginPath();
        ctx.arc(concept.x, concept.y, concept.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw border for selected
        if (isSelected) {
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Draw label
        if (zoom > 0.5) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.font = `${Math.min(14, concept.radius * 1.2) * zoom}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const label = concept.label.substring(0, Math.ceil(25 / zoom));
          ctx.fillText(label, concept.x, concept.y);
        }
      }
    });

    ctx.restore();
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const worldX = (x - centerX - pan.x) / zoom;
    const worldY = (y - centerY - pan.y) / zoom;

    const concepts = simulationConceptsRef.current;
    for (const concept of concepts) {
      const distance = Math.sqrt((concept.x - worldX) ** 2 + (concept.y - worldY) ** 2);
      if (distance <= concept.radius * 1.5) {
        setSelectedConcept(concept);
        return;
      }
    }

    setSelectedConcept(null);
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const newZoom = Math.max(0.2, Math.min(5, zoom + (e.deltaY > 0 ? -zoomSpeed : zoomSpeed)));
    setZoom(newZoom);
  };

  // Handle pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 2) return; // Right click

    let lastX = e.clientX;
    let lastY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - lastX;
      const deltaY = moveEvent.clientY - lastY;

      setPan((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isOpen || !graph) return null;

  const stats = {
    totalConcepts: graph.concepts.length,
    totalRelationships: graph.relationships.length,
    topConcepts: graph.topConcepts,
  };

  return (
    <div className="knowledge-graph-overlay" onClick={onClose}>
      <div className="knowledge-graph-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="kg-header">
          <h2>Knowledge Graph</h2>
          <button className="kg-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Controls */}
        <div className="kg-controls">
          <input
            type="text"
            placeholder="Search concepts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="kg-search"
          />

          <div className="kg-filters">
            <button
              className={`kg-filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`kg-filter-btn ${filterType === 'entity' ? 'active' : ''}`}
              onClick={() => setFilterType('entity')}
              title="Entities (proper nouns)"
            >
              Entities
            </button>
            <button
              className={`kg-filter-btn ${filterType === 'topic' ? 'active' : ''}`}
              onClick={() => setFilterType('topic')}
              title="Topics (keywords)"
            >
              Topics
            </button>
            <button
              className={`kg-filter-btn ${filterType === 'technique' ? 'active' : ''}`}
              onClick={() => setFilterType('technique')}
              title="Techniques (methods)"
            >
              Techniques
            </button>
            <button
              className={`kg-filter-btn ${filterType === 'question' ? 'active' : ''}`}
              onClick={() => setFilterType('question')}
              title="Questions"
            >
              Questions
            </button>
            <button
              className={`kg-filter-btn ${filterType === 'problem' ? 'active' : ''}`}
              onClick={() => setFilterType('problem')}
              title="Problems"
            >
              Problems
            </button>
          </div>

          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`kg-simulate-btn ${isSimulating ? 'active' : ''}`}
            title={isSimulating ? 'Pause simulation' : 'Start simulation'}
          >
            {isSimulating ? '⏸️ Pause' : '▶️ Start'}
          </button>
        </div>

        {/* Canvas and Info */}
        <div className="kg-content">
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            onClick={handleCanvasClick}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onContextMenu={(e) => e.preventDefault()}
            className="kg-canvas"
            title="Click to select | Right-drag to pan | Scroll to zoom"
          />

          {/* Info Panel */}
          <div className="kg-info">
            {/* Stats */}
            <div className="kg-section">
              <h3>Statistics</h3>
              <div className="kg-stat-item">
                <span className="kg-stat-label">Concepts:</span>
                <span className="kg-stat-value">{stats.totalConcepts}</span>
              </div>
              <div className="kg-stat-item">
                <span className="kg-stat-label">Relationships:</span>
                <span className="kg-stat-value">{stats.totalRelationships}</span>
              </div>
            </div>

            {/* Top Concepts */}
            <div className="kg-section">
              <h3>Top Concepts</h3>
              <div className="kg-concept-list">
                {stats.topConcepts.map((conceptId) => {
                  const concept = graph.conceptMap.get(conceptId);
                  if (!concept) return null;

                  return (
                    <div
                      key={conceptId}
                      className="kg-concept-item"
                      onClick={() => {
                        const sim = simulationConceptsRef.current.find((c) => c.id === conceptId);
                        if (sim) setSelectedConcept(sim);
                      }}
                    >
                      <span className={`kg-concept-badge kg-type-${concept.type}`} title={concept.type}>
                        {concept.type.charAt(0).toUpperCase()}
                      </span>
                      <span className="kg-concept-text">{concept.label}</span>
                      <span className="kg-concept-freq">{concept.frequency}x</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Concept */}
            {selectedConcept && graph.conceptMap.get(selectedConcept.id) && (
              <div className="kg-section kg-selected">
                <h3>Selected Concept</h3>
                <div className="kg-selected-content">
                  <div className="kg-selected-label">{selectedConcept.label}</div>
                  <div className="kg-selected-type">{selectedConcept.type}</div>

                  <div className="kg-selected-stats">
                    <div className="kg-stat-item">
                      <span className="kg-stat-label">Frequency:</span>
                      <span className="kg-stat-value">{selectedConcept.frequency}</span>
                    </div>
                    <div className="kg-stat-item">
                      <span className="kg-stat-label">Importance:</span>
                      <span className="kg-stat-value">{(selectedConcept.importance * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {selectedConcept.type && (
                    <div className="kg-concept-description">
                      {selectedConcept.type === 'entity' && 'Named entity or proper noun mentioned in conversation'}
                      {selectedConcept.type === 'topic' && 'Key topic or subject area'}
                      {selectedConcept.type === 'technique' && 'Method or technique discussed'}
                      {selectedConcept.type === 'question' && 'Question or inquiry explored'}
                      {selectedConcept.type === 'problem' && 'Problem or issue identified'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Help */}
            <div className="kg-section kg-help">
              <h4>Controls</h4>
              <ul>
                <li>Click concept to select</li>
                <li>Scroll to zoom</li>
                <li>Right-drag to pan</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default KnowledgeGraphVisualizer;
