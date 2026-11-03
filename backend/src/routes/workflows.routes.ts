import { Router } from "express";
import * as controller from "../controllers/workflows.controller.js";

export const workflowsRouter = Router();

workflowsRouter.post("/", controller.createWorkflow);
workflowsRouter.get("/", controller.listWorkflows);
workflowsRouter.get("/:id", controller.getWorkflow);
workflowsRouter.post("/:id/nodes", controller.addNode);
workflowsRouter.post("/:id/edges", controller.addEdge);
