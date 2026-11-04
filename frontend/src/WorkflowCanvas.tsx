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
import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./api";
import { GenerateWorkflowPanel } from "./GenerateWorkflowPanel";
import { STEP_TYPE_OPTIONS } from "./types";
import type { GeneratedEdge, GeneratedNode, RunResult, WorkflowEdge, WorkflowNode } from "./types";

interface WorkflowCanvasProps {
  workflowId: string;
  onBack: () => void;
}

const PREVIEW_NODE_PREFIX = "preview:";
const PREVIEW_EDGE_PREFIX = "preview-edge:";

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

function toRfPreviewNode(node: GeneratedNode, position: { x: number; y: number }): Node {
  return {
    id: `${PREVIEW_NODE_PREFIX}${node.tempId}`,
    position,
    data: { label: `${node.label}\n(${node.type})`, isPreview: true },
    style: {
      background: node.category === "trigger" ? "#fef3c7" : "#fffbeb",
      border: "2px dashed #d97706",
      borderRadius: 6,
      padding: 8,
      fontSize: 12,
      whiteSpace: "pre-line",
      width: 160,
    },
  };
}

function toRfPreviewEdge(edge: GeneratedEdge): Edge {
  return {
    id: `${PREVIEW_EDGE_PREFIX}${edge.sourceTempId}-${edge.targetTempId}`,
    source: `${PREVIEW_NODE_PREFIX}${edge.sourceTempId}`,
    target: `${PREVIEW_NODE_PREFIX}${edge.targetTempId}`,
    style: { strokeDasharray: "4 2", stroke: "#d97706" },
  };
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
  const [preview, setPreview] = useState<{ nodes: GeneratedNode[]; edges: GeneratedEdge[] } | null>(
    null,
  );
  const [savingGenerated, setSavingGenerated] = useState(false);
  const tempIdToRealId = useRef(new Map<string, string>());

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
      if (
        connection.source.startsWith(PREVIEW_NODE_PREFIX) ||
        connection.target.startsWith(PREVIEW_NODE_PREFIX)
      ) {
        setError("Save or discard the generated workflow before adding connections manually.");
        return;
      }
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
      if (node.id.startsWith(PREVIEW_NODE_PREFIX)) return;
      try {
        await api.updateNodePosition(workflowId, node.id, node.position);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [workflowId],
  );

  function handleGenerated(generated: { nodes: GeneratedNode[]; edges: GeneratedEdge[] }) {
    const existingMaxY = nodes
      .filter((n) => !n.data?.isPreview)
      .reduce((max, n) => Math.max(max, n.position.y), 0);
    const baseY = nodes.length > 0 ? existingMaxY + 160 : 80;

    const previewRfNodes = generated.nodes.map((n, i) =>
      toRfPreviewNode(n, { x: 80 + i * 220, y: baseY }),
    );
    const previewRfEdges = generated.edges.map(toRfPreviewEdge);

    setNodes((nds) => [...nds, ...previewRfNodes]);
    setEdges((eds) => [...eds, ...previewRfEdges]);
    setPreview(generated);
    tempIdToRealId.current.clear();
  }

  async function handleSaveGenerated() {
    if (!preview) return;
    setSavingGenerated(true);
    setError(null);

    try {
      for (const node of preview.nodes) {
        if (tempIdToRealId.current.has(node.tempId)) continue;

        const rfNode = nodes.find((n) => n.id === `${PREVIEW_NODE_PREFIX}${node.tempId}`);
        const position = rfNode?.position ?? { x: 80, y: 80 };

        const created = await api.addNode(workflowId, {
          category: node.category,
          type: node.type,
          label: node.label,
          config: node.config,
          position,
        });
        tempIdToRealId.current.set(node.tempId, created.id);
      }

      for (const edge of preview.edges) {
        const sourceId = tempIdToRealId.current.get(edge.sourceTempId);
        const targetId = tempIdToRealId.current.get(edge.targetTempId);
        if (sourceId && targetId) {
          await api.addEdge(workflowId, { sourceId, targetId });
        }
      }

      const detail = await api.getWorkflow(workflowId);
      setNodes(detail.nodes.map(toRfNode));
      setEdges(detail.edges.map(toRfEdge));
      setNodeCount(detail.nodes.length);
      setPreview(null);
      tempIdToRealId.current.clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // preview and tempIdToRealId are deliberately NOT cleared here — clicking
      // Save again will skip already-saved nodes and resume instead of duplicating.
    } finally {
      setSavingGenerated(false);
    }
  }

  function handleDiscardGenerated() {
    setPreview(null);
    tempIdToRealId.current.clear();
    setNodes((nds) => nds.filter((n) => !n.id.startsWith(PREVIEW_NODE_PREFIX)));
    setEdges((eds) => eds.filter((e) => !e.id.startsWith(PREVIEW_EDGE_PREFIX)));
  }

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

      <GenerateWorkflowPanel onGenerated={handleGenerated} />

      {preview && (
        <div className="preview-actions">
          <span>Generated workflow is unsaved — review it on the canvas below.</span>
          <button onClick={handleSaveGenerated} disabled={savingGenerated} className="run-button">
            {savingGenerated ? "Saving..." : "Save Generated Workflow"}
          </button>
          <button onClick={handleDiscardGenerated} disabled={savingGenerated}>
            Discard
          </button>
        </div>
      )}

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
