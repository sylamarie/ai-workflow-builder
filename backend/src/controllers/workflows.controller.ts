import type { NextFunction, Request, Response } from "express";
import * as executionService from "../services/execution.service.js";
import * as workflowService from "../services/workflow.service.js";
import { HttpError } from "../middleware/errorHandler.js";

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const createWorkflow = asyncHandler(async (req, res) => {
  const workflow = await workflowService.createWorkflow(req.body);
  res.status(201).json(workflow);
});

export const listWorkflows = asyncHandler(async (_req, res) => {
  const workflows = await workflowService.listWorkflows();
  res.status(200).json(workflows);
});

export const getWorkflow = asyncHandler(async (req, res) => {
  const detail = await workflowService.getWorkflow(req.params.id as string);
  res.status(200).json(detail);
});

export const addNode = asyncHandler(async (req, res) => {
  const node = await workflowService.addNode(req.params.id as string, req.body);
  res.status(201).json(node);
});

export const addEdge = asyncHandler(async (req, res) => {
  const edge = await workflowService.addEdge(req.params.id as string, req.body);
  res.status(201).json(edge);
});

export const updateNodePosition = asyncHandler(async (req, res) => {
  const node = await workflowService.updateNodePosition(
    req.params.id as string,
    req.params.nodeId as string,
    req.body,
  );
  res.status(200).json(node);
});

export const runWorkflow = asyncHandler(async (req, res) => {
  const result = await executionService.runWorkflow(req.params.id as string, req.body ?? {});
  res.status(200).json(result);
});

export const runWebhook = asyncHandler(async (req, res) => {
  const providedSecret = req.header("X-Webhook-Secret");
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret || providedSecret !== expectedSecret) {
    throw new HttpError(401, "Invalid or missing X-Webhook-Secret header");
  }

  const result = await executionService.runWorkflow(req.params.id as string, req.body);
  res.status(200).json(result);
});
