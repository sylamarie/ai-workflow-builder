import { HttpError } from "../middleware/errorHandler.js";
import type { RunResult, StepContext, StepHandler, StepLogEntry } from "../types/workflow.types.js";
import { getWorkflow } from "./workflow.service.js";

const stepHandlers: Record<string, StepHandler> = {
  "action.log": async (config) => {
    const message = (config.message as string | undefined) ?? "";
    console.log(`[workflow log] ${message}`);
    return { message };
  },
  "action.wait": async (config) => {
    const ms = (config.ms as number | undefined) ?? 0;
    await new Promise((resolve) => setTimeout(resolve, ms));
    return { waitedMs: ms };
  },
};

export function registerStepHandler(type: string, handler: StepHandler): void {
  stepHandlers[type] = handler;
}

export async function runWorkflow(workflowId: string): Promise<RunResult> {
  const { nodes, edges } = await getWorkflow(workflowId);

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nextByNodeId = new Map(edges.map((edge) => [edge.source, edge.target]));

  const triggerNode = nodes.find((node) => node.category === "trigger");
  if (!triggerNode) {
    throw new HttpError(400, "Workflow has no trigger node to run");
  }

  const steps: StepLogEntry[] = [];
  const context: StepContext = {};
  const now = () => new Date().toISOString();

  steps.push({
    nodeId: triggerNode.id,
    type: triggerNode.type,
    label: triggerNode.label,
    status: "success",
    output: { triggered: true },
    startedAt: now(),
    finishedAt: now(),
  });

  let currentId = nextByNodeId.get(triggerNode.id);

  while (currentId) {
    const node = nodeById.get(currentId);
    if (!node) {
      break;
    }

    const handler = stepHandlers[node.type];
    const startedAt = now();

    if (!handler) {
      steps.push({
        nodeId: node.id,
        type: node.type,
        label: node.label,
        status: "error",
        error: `No handler registered for step type "${node.type}"`,
        startedAt,
        finishedAt: now(),
      });
      return { workflowId, status: "error", steps };
    }

    try {
      const output = await handler(node.config, context);
      steps.push({
        nodeId: node.id,
        type: node.type,
        label: node.label,
        status: "success",
        output,
        startedAt,
        finishedAt: now(),
      });
    } catch (err) {
      steps.push({
        nodeId: node.id,
        type: node.type,
        label: node.label,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        startedAt,
        finishedAt: now(),
      });
      return { workflowId, status: "error", steps };
    }

    currentId = nextByNodeId.get(node.id);
  }

  return { workflowId, status: "success", steps };
}
