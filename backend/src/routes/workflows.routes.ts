import { Router } from "express";
import * as controller from "../controllers/workflows.controller.js";
import * as generationController from "../controllers/generation.controller.js";
import { generationRateLimit } from "../middleware/generationRateLimit.js";

export const workflowsRouter = Router();

workflowsRouter.post("/", controller.createWorkflow);
workflowsRouter.get("/", controller.listWorkflows);
workflowsRouter.post("/generate", generationRateLimit, generationController.generateWorkflow);
workflowsRouter.get("/:id", controller.getWorkflow);
workflowsRouter.post("/:id/nodes", controller.addNode);
workflowsRouter.post("/:id/edges", controller.addEdge);
workflowsRouter.patch("/:id/nodes/:nodeId", controller.updateNodePosition);
workflowsRouter.post("/:id/run", controller.runWorkflow);
workflowsRouter.post("/:id/webhook", controller.runWebhook);
