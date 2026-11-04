export interface LinearWorkflowNode {
  tempId: string;
  category: "trigger" | "action";
}

export interface LinearWorkflowEdge {
  sourceTempId: string;
  targetTempId: string;
}

export type LinearWorkflowCheck = { ok: true } | { ok: false; reason: string };

export function validateLinearWorkflow(
  nodes: LinearWorkflowNode[],
  edges: LinearWorkflowEdge[],
): LinearWorkflowCheck {
  const triggers = nodes.filter((n) => n.category === "trigger");
  if (triggers.length === 0) {
    return { ok: false, reason: "The workflow has no trigger node." };
  }
  if (triggers.length > 1) {
    return { ok: false, reason: "The workflow has more than one trigger node." };
  }

  const nodeIds = new Set(nodes.map((n) => n.tempId));
  const outCount = new Map<string, number>();
  const inCount = new Map<string, number>();
  const nextOf = new Map<string, string>();

  for (const edge of edges) {
    if (!nodeIds.has(edge.sourceTempId) || !nodeIds.has(edge.targetTempId)) {
      return { ok: false, reason: "An edge references a node that doesn't exist." };
    }
    outCount.set(edge.sourceTempId, (outCount.get(edge.sourceTempId) ?? 0) + 1);
    inCount.set(edge.targetTempId, (inCount.get(edge.targetTempId) ?? 0) + 1);
    nextOf.set(edge.sourceTempId, edge.targetTempId);
  }

  if ([...outCount.values()].some((count) => count > 1)) {
    return { ok: false, reason: "A node branches into more than one next step." };
  }
  if ([...inCount.values()].some((count) => count > 1)) {
    return { ok: false, reason: "A node has more than one incoming connection." };
  }

  const visited = new Set<string>();
  let current: string | undefined = triggers[0].tempId;
  while (current) {
    if (visited.has(current)) {
      return { ok: false, reason: "The workflow contains a cycle." };
    }
    visited.add(current);
    current = nextOf.get(current);
  }

  if (visited.size !== nodes.length) {
    return { ok: false, reason: "One or more nodes are not connected to the trigger." };
  }

  return { ok: true };
}
