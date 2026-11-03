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
