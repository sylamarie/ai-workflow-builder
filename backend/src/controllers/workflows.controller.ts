import type { NextFunction, Request, Response } from "express";
import * as workflowService from "../services/workflow.service.js";

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
