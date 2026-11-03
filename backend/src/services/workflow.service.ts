import { randomUUID } from "node:crypto";
import { driver } from "../db/driver.js";
import { HttpError } from "../middleware/errorHandler.js";
import type {
  CreateEdgeInput,
  CreateNodeInput,
  CreateWorkflowInput,
  UpdateNodePositionInput,
  Workflow,
  WorkflowDetail,
  WorkflowEdge,
  WorkflowNode,
  WorkflowSummary,
} from "../types/workflow.types.js";

function toWorkflow(props: Record<string, unknown>): Workflow {
  return {
    id: props.id as string,
    name: props.name as string,
    createdAt: props.createdAt as string,
    updatedAt: props.updatedAt as string,
  };
}

function toWorkflowNode(props: Record<string, unknown>): WorkflowNode {
  return {
    id: props.id as string,
    workflowId: props.workflowId as string,
    category: props.category as NodeCategory,
    type: props.type as string,
    label: props.label as string,
    config: JSON.parse((props.config as string) ?? "{}"),
    position: { x: props.positionX as number, y: props.positionY as number },
    createdAt: props.createdAt as string,
  };
}

type NodeCategory = WorkflowNode["category"];

export async function createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const { records } = await driver.executeQuery(
    `CREATE (w:Workflow { id: $id, name: $name, createdAt: $now, updatedAt: $now })
     RETURN w`,
    { id, name: input.name, now },
  );

  return toWorkflow(records[0].get("w").properties);
}

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  const { records } = await driver.executeQuery(
    `MATCH (w:Workflow)
     OPTIONAL MATCH (w)-[:HAS_NODE]->(n:WorkflowNode)
     RETURN w, count(n) AS nodeCount
     ORDER BY w.updatedAt DESC`,
    {},
  );

  return records.map((record) => ({
    ...toWorkflow(record.get("w").properties),
    nodeCount: record.get("nodeCount").toNumber(),
  }));
}

async function findWorkflowOrThrow(workflowId: string): Promise<Workflow> {
  const { records } = await driver.executeQuery(
    `MATCH (w:Workflow { id: $workflowId }) RETURN w`,
    { workflowId },
  );

  if (records.length === 0) {
    throw new HttpError(404, `Workflow ${workflowId} not found`);
  }

  return toWorkflow(records[0].get("w").properties);
}

export async function getWorkflow(workflowId: string): Promise<WorkflowDetail> {
  const workflow = await findWorkflowOrThrow(workflowId);

  const nodesResult = await driver.executeQuery(
    `MATCH (:Workflow { id: $workflowId })-[:HAS_NODE]->(n:WorkflowNode)
     RETURN n`,
    { workflowId },
  );
  const nodes = nodesResult.records.map((record) => toWorkflowNode(record.get("n").properties));

  const edgesResult = await driver.executeQuery(
    `MATCH (:Workflow { id: $workflowId })-[:HAS_NODE]->(a:WorkflowNode)-[:NEXT]->(b:WorkflowNode)
     RETURN a.id AS source, b.id AS target`,
    { workflowId },
  );
  const edges: WorkflowEdge[] = edgesResult.records.map((record) => ({
    source: record.get("source") as string,
    target: record.get("target") as string,
  }));

  return { workflow, nodes, edges };
}

export async function addNode(workflowId: string, input: CreateNodeInput): Promise<WorkflowNode> {
  await findWorkflowOrThrow(workflowId);

  const id = randomUUID();
  const now = new Date().toISOString();

  const { records } = await driver.executeQuery(
    `MATCH (w:Workflow { id: $workflowId })
     CREATE (n:WorkflowNode {
       id: $id, workflowId: $workflowId, category: $category, type: $type,
       label: $label, config: $config, positionX: $positionX, positionY: $positionY,
       createdAt: $now
     })
     CREATE (w)-[:HAS_NODE]->(n)
     SET w.updatedAt = $now
     RETURN n`,
    {
      workflowId,
      id,
      category: input.category,
      type: input.type,
      label: input.label,
      config: JSON.stringify(input.config ?? {}),
      positionX: input.position.x,
      positionY: input.position.y,
      now,
    },
  );

  return toWorkflowNode(records[0].get("n").properties);
}

export async function addEdge(workflowId: string, input: CreateEdgeInput): Promise<WorkflowEdge> {
  await findWorkflowOrThrow(workflowId);

  const { records } = await driver.executeQuery(
    `MATCH (a:WorkflowNode { id: $sourceId, workflowId: $workflowId })
     MATCH (b:WorkflowNode { id: $targetId, workflowId: $workflowId })
     MERGE (a)-[:NEXT]->(b)
     WITH a, b
     MATCH (w:Workflow { id: $workflowId })
     SET w.updatedAt = $now
     RETURN a.id AS source, b.id AS target`,
    {
      workflowId,
      sourceId: input.sourceId,
      targetId: input.targetId,
      now: new Date().toISOString(),
    },
  );

  if (records.length === 0) {
    throw new HttpError(404, "One or both nodes not found in this workflow");
  }

  return {
    source: records[0].get("source") as string,
    target: records[0].get("target") as string,
  };
}

export async function updateNodePosition(
  workflowId: string,
  nodeId: string,
  input: UpdateNodePositionInput,
): Promise<WorkflowNode> {
  const { records } = await driver.executeQuery(
    `MATCH (n:WorkflowNode { id: $nodeId, workflowId: $workflowId })
     SET n.positionX = $positionX, n.positionY = $positionY
     RETURN n`,
    {
      workflowId,
      nodeId,
      positionX: input.position.x,
      positionY: input.position.y,
    },
  );

  if (records.length === 0) {
    throw new HttpError(404, `Node ${nodeId} not found in workflow ${workflowId}`);
  }

  return toWorkflowNode(records[0].get("n").properties);
}
