import type {
  GenerateWorkflowResult,
  NodeCategory,
  RunResult,
  Workflow,
  WorkflowDetail,
  WorkflowEdge,
  WorkflowNode,
  WorkflowSummary,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/workflows${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function listWorkflows(): Promise<WorkflowSummary[]> {
  return request("");
}

export function createWorkflow(name: string): Promise<Workflow> {
  return request("", { method: "POST", body: JSON.stringify({ name }) });
}

export function getWorkflow(workflowId: string): Promise<WorkflowDetail> {
  return request(`/${workflowId}`);
}

export function addNode(
  workflowId: string,
  input: {
    category: NodeCategory;
    type: string;
    label: string;
    config: Record<string, unknown>;
    position: { x: number; y: number };
  },
): Promise<WorkflowNode> {
  return request(`/${workflowId}/nodes`, { method: "POST", body: JSON.stringify(input) });
}

export function addEdge(
  workflowId: string,
  input: { sourceId: string; targetId: string },
): Promise<WorkflowEdge> {
  return request(`/${workflowId}/edges`, { method: "POST", body: JSON.stringify(input) });
}

export function updateNodePosition(
  workflowId: string,
  nodeId: string,
  position: { x: number; y: number },
): Promise<WorkflowNode> {
  return request(`/${workflowId}/nodes/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify({ position }),
  });
}

export function runWorkflow(
  workflowId: string,
  context: Record<string, unknown> = {},
): Promise<RunResult> {
  return request(`/${workflowId}/run`, { method: "POST", body: JSON.stringify(context) });
}

export function generateWorkflow(description: string): Promise<GenerateWorkflowResult> {
  return request("/generate", { method: "POST", body: JSON.stringify({ description }) });
}
