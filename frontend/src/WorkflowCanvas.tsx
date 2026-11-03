import {
  Background,
  Controls,
  ReactFlow,
  addEdge as applyEdgeConnection,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import type { Connection, Edge, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useState } from "react";
import * as api from "./api";
import { STEP_TYPE_OPTIONS } from "./types";
import type { RunResult, WorkflowEdge, WorkflowNode } from "./types";

interface WorkflowCanvasProps {
  workflowId: string;
  onBack: () => void;
}

function toRfNode(node: WorkflowNode): Node {
  return {
    id: node.id,
    position: node.position,
    data: { label: `${node.label}\n(${node.type})` },
    style: {
      background: node.category === "trigger" ? "#dbeafe" : "#f3f4f6",
      border: "1px solid #9ca3af",
      borderRadius: 6,
      padding: 8,
      fontSize: 12,
      whiteSpace: "pre-line",
      width: 160,
    },
  };
}

function toRfEdge(edge: WorkflowEdge): Edge {
  return { id: `${edge.source}-${edge.target}`, source: edge.source, target: edge.target };
}

export function WorkflowCanvas({ workflowId, onBack }: WorkflowCanvasProps) {
  const [workflowName, setWorkflowName] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [error, setError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [testInput, setTestInput] = useState("");

  useEffect(() => {
    api
      .getWorkflow(workflowId)
      .then((detail) => {
        setWorkflowName(detail.workflow.name);
        setNodes(detail.nodes.map(toRfNode));
        setEdges(detail.edges.map(toRfEdge));
        setNodeCount(detail.nodes.length);
      })
      .catch((err: Error) => setError(err.message));
  }, [workflowId, setNodes, setEdges]);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      try {
        await api.addEdge(workflowId, { sourceId: connection.source, targetId: connection.target });
        setEdges((eds) => applyEdgeConnection(connection, eds));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [workflowId, setEdges],
  );

  const onNodeDragStop = useCallback(
    async (_event: unknown, node: Node) => {
      try {
        await api.updateNodePosition(workflowId, node.id, node.position);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [workflowId],
  );

  async function handleAddStep(option: (typeof STEP_TYPE_OPTIONS)[number]) {
    try {
      const position = { x: 80 + (nodeCount % 5) * 180, y: 80 + Math.floor(nodeCount / 5) * 120 };
      const node = await api.addNode(workflowId, {
        category: option.category,
        type: option.type,
        label: option.label,
        config: option.defaultConfig,
        position,
      });
      setNodes((nds) => [...nds, toRfNode(node)]);
      setNodeCount((c) => c + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const context = testInput.trim() ? { text: testInput.trim() } : {};
      const result = await api.runWorkflow(workflowId, context);
      setRunResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="page">
      <div className="canvas-header">
        <button onClick={onBack}>&larr; Back to workflows</button>
        <h2>{workflowName}</h2>
        <input
          type="text"
          className="test-input"
          placeholder="Test input text (used by AI Classify steps)"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
        />
        <button onClick={handleRun} disabled={running} className="run-button">
          {running ? "Running..." : "Run"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="palette">
        {STEP_TYPE_OPTIONS.map((option) => (
          <button key={option.type} onClick={() => handleAddStep(option)}>
            + {option.label}
          </button>
        ))}
      </div>

      <div className="canvas-layout">
        <div className="canvas-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {runResult && (
          <div className="run-log">
            <h3>Run result: {runResult.status}</h3>
            <ol>
              {runResult.steps.map((step, i) => (
                <li key={i} className={`step-${step.status}`}>
                  <strong>{step.label}</strong> ({step.type}) — {step.status}
                  {step.output !== undefined && (
                    <pre>{JSON.stringify(step.output, null, 2)}</pre>
                  )}
                  {step.error && <pre className="error">{step.error}</pre>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
