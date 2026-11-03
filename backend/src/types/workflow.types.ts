export type NodeCategory = "trigger" | "action";

export interface Workflow {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowSummary extends Workflow {
  nodeCount: number;
}

export interface WorkflowNode {
  id: string;
  workflowId: string;
  category: NodeCategory;
  type: string;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  createdAt: string;
}

export interface WorkflowEdge {
  source: string;
  target: string;
}

export interface WorkflowDetail {
  workflow: Workflow;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface CreateWorkflowInput {
  name: string;
}

export interface CreateNodeInput {
  category: NodeCategory;
  type: string;
  label: string;
  config?: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface CreateEdgeInput {
  sourceId: string;
  targetId: string;
}

export interface UpdateNodePositionInput {
  position: { x: number; y: number };
}

export interface StepLogEntry {
  nodeId: string;
  type: string;
  label: string;
  status: "success" | "error";
  output?: unknown;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

export interface RunResult {
  workflowId: string;
  status: "success" | "error";
  steps: StepLogEntry[];
}

export type StepContext = Record<string, unknown>;

export type StepHandler = (
  config: Record<string, unknown>,
  context: StepContext,
) => Promise<unknown>;
