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

export interface StepTypeOption {
  category: NodeCategory;
  type: string;
  label: string;
  defaultConfig: Record<string, unknown>;
}

// Kept in sync by hand with backend/src/ai/supportedStepTypes.ts — the AI workflow
// generator's schema/prompt use the same 5 step types. Update both if you add a step type.
export const STEP_TYPE_OPTIONS: StepTypeOption[] = [
  { category: "trigger", type: "trigger.manual", label: "Manual Trigger", defaultConfig: {} },
  { category: "trigger", type: "trigger.webhook", label: "Webhook Trigger", defaultConfig: {} },
  {
    category: "action",
    type: "action.log",
    label: "Log",
    defaultConfig: { message: "Hello from this step" },
  },
  { category: "action", type: "action.wait", label: "Wait", defaultConfig: { ms: 1000 } },
  {
    category: "action",
    type: "action.ai_classify",
    label: "AI Classify",
    defaultConfig: { categories: ["positive", "negative", "neutral"] },
  },
];

export interface GeneratedNode {
  tempId: string;
  category: NodeCategory;
  type: string;
  label: string;
  config: Record<string, unknown>;
}

export interface GeneratedEdge {
  sourceTempId: string;
  targetTempId: string;
}

export type GenerateWorkflowResult =
  | { status: "ok"; workflow: { nodes: GeneratedNode[]; edges: GeneratedEdge[] } }
  | { status: "unsupported"; reason: string };
