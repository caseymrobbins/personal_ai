/**
 * Network Graph Visualizer Component
 *
 * Displays conversation network as interactive force-directed graph:
 * - Canvas-based rendering for performance
 * - Force simulation for node positioning
 * - Interactive zoom, pan, and node selection
 * - Statistics panel showing graph metrics
 * - Search and filtering
 */

import { useEffect, useRef, useState } from 'react';
import { networkGraphService, type NetworkGraph, type GraphNode } from '../../services/network-graph.service';
import { dbService } from '../../services/db.service';
import './NetworkGraphVisualizer.css';

export interface NetworkGraphVisualizerProps {
  conversationId?: string; // If provided, highlight this conversation
}

interface SimulationNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface SimulationLink {
  source: SimulationNode;
  target: SimulationNode;
  weight: number;
  type: string;
}

export function NetworkGraphVisualizer({ conversationId }: NetworkGraphVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graph, setGraph] = useState<NetworkGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const simulationNodesRef = useRef<SimulationNode[]>([]);
  const simulationLinksRef = useRef<SimulationLink[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Build graph on mount
  useEffect(() => {
    const newGraph = networkGraphService.buildNetworkGraph();
    setGraph(newGraph);

    // Initialize simulation
    if (newGraph.nodes.length > 0) {
      initializeSimulation(newGraph);
      setIsSimulating(true);
    }
  }, []);

  // Start animation loop
  useEffect(() => {
    if (!isSimulating || !canvasRef.current) return;

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
  }, [isSimulating, zoom, pan]);

  /**
   * Initialize force-directed simulation
   */
  const initializeSimulation = (networkGraph: NetworkGraph) => {
    // Create simulation nodes
    const simNodes: SimulationNode[] = networkGraph.nodes.map((node) => ({
      ...node,
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
      vx: 0,
      vy: 0,
    }));

    // Create simulation links
    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));
    const simLinks: SimulationLink[] = networkGraph.links.map((link) => ({
      source: nodeMap.get(link.source)!,
      target: nodeMap.get(link.target)!,
      weight: link.weight,
      type: link.type,
    }));

    simulationNodesRef.current = simNodes;
    simulationLinksRef.current = simLinks;
  };

  /**
   * Update force simulation
   */
  const updateSimulation = () => {
    const nodes = simulationNodesRef.current;
    const links = simulationLinksRef.current;
    const k = 50; // Spring strength
    const damping = 0.99;
    const repulsion = 10000;

    // Apply repulsive forces between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (distance * distance);

        nodes[i].vx -= (force * dx) / distance;
        nodes[i].vy -= (force * dy) / distance;
        nodes[j].vx += (force * dx) / distance;
        nodes[j].vy += (force * dy) / distance;
      }
    }

    // Apply attractive forces along links
    links.forEach((link) => {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = ((distance - k) * link.weight) / distance;

      link.source.vx += (force * dx) / 50;
      link.source.vy += (force * dy) / 50;
      link.target.vx -= (force * dx) / 50;
      link.target.vy -= (force * dy) / 50;
    });

    // Update positions
    nodes.forEach((node) => {
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
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

    const nodes = simulationNodesRef.current;
    const links = simulationLinksRef.current;

    // Clear canvas
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.save();
    ctx.translate(centerX + pan.x, centerY + pan.y);
    ctx.scale(zoom, zoom);

    // Draw links
    links.forEach((link) => {
      const x1 = link.source.x;
      const y1 = link.source.y;
      const x2 = link.target.x;
      const y2 = link.target.y;

      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + link.weight * 0.3})`;
      ctx.lineWidth = Math.max(0.5, link.weight * 2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((node) => {
      const size = node.size * zoom;
      const isSelected = selectedNode?.id === node.id;
      const isHighlighted = conversationId === node.id;

      // Draw node circle
      ctx.fillStyle = isSelected ? '#FFD700' : isHighlighted ? '#22c55e' : node.color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Draw border for selected/highlighted nodes
      if (isSelected || isHighlighted) {
        ctx.strokeStyle = isSelected ? '#FFD700' : '#22c55e';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw label if not too zoomed out
      if (zoom > 0.5) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `${10 * zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const label = node.label.substring(0, Math.ceil(20 / zoom));
        ctx.fillText(label, node.x, node.y);
      }
    });

    ctx.restore();
  };

  // Handle canvas click for node selection
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Transform click coordinates back to world space
    const worldX = (x - centerX - pan.x) / zoom;
    const worldY = (y - centerY - pan.y) / zoom;

    // Find node at click position
    const nodes = simulationNodesRef.current;
    for (const node of nodes) {
      const distance = Math.sqrt((node.x - worldX) ** 2 + (node.y - worldY) ** 2);
      if (distance <= node.size * 1.5) {
        setSelectedNode(node);
        return;
      }
    }

    setSelectedNode(null);
  };

  // Handle mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const newZoom = Math.max(0.2, Math.min(5, zoom + (e.deltaY > 0 ? -zoomSpeed : zoomSpeed)));
    setZoom(newZoom);
  };

  // Handle pan with mouse drag
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

  const filteredGraph = graph
    ? {
        ...graph,
        nodes: graph.nodes.filter(
          (n) =>
            searchQuery === '' ||
            n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.keywords.some((k) => k.includes(searchQuery.toLowerCase()))
        ),
      }
    : null;

  const stats = filteredGraph ? networkGraphService.getGraphStatistics(filteredGraph) : null;

  return (
    <div className="network-visualizer">
      <div className="visualizer-header">
        <h2>Conversation Network</h2>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="visualizer-search"
        />
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`visualizer-simulate-btn ${isSimulating ? 'active' : ''}`}
          title={isSimulating ? 'Stop simulation' : 'Start simulation'}
        >
          {isSimulating ? '⏸️ Pause' : '▶️ Start'}
        </button>
      </div>

      <div className="visualizer-container">
        <canvas
          ref={canvasRef}
          width={1200}
          height={700}
          onClick={handleCanvasClick}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onContextMenu={(e) => e.preventDefault()}
          className="visualizer-canvas"
          title="Click to select | Right-drag to pan | Scroll to zoom"
        />

        {/* Info Panel */}
        <div className="visualizer-info">
          {stats && (
            <>
              <div className="info-section">
                <h3>Graph Statistics</h3>
                <div className="stat-item">
                  <span className="stat-label">Nodes:</span>
                  <span className="stat-value">{stats.nodeCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Links:</span>
                  <span className="stat-value">{stats.linkCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Density:</span>
                  <span className="stat-value">{stats.density.toFixed(3)}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Clusters:</span>
                  <span className="stat-value">{stats.clusterCount}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Cluster Size:</span>
                  <span className="stat-value">{stats.avgClusterSize.toFixed(1)}</span>
                </div>
              </div>
            </>
          )}

          {selectedNode && (
            <div className="info-section selected-node">
              <h3>Selected Conversation</h3>
              <div className="node-info">
                <div className="info-item">
                  <span className="label">Title:</span>
                  <span className="value">{selectedNode.title}</span>
                </div>
                <div className="info-item">
                  <span className="label">Messages:</span>
                  <span className="value">{selectedNode.messageCount}</span>
                </div>
                <div className="info-item">
                  <span className="label">Keywords:</span>
                  <div className="keywords">
                    {selectedNode.keywords.slice(0, 5).map((k) => (
                      <span key={k} className="keyword">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="info-section help">
            <h4>Controls</h4>
            <ul>
              <li>Click node to select</li>
              <li>Scroll to zoom</li>
              <li>Right-drag to pan</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NetworkGraphVisualizer;
