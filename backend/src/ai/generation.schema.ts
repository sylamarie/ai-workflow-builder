import { z } from "zod";
import { SUPPORTED_STEP_TYPES } from "./supportedStepTypes.js";

// Zod's discriminatedUnion needs a literal tuple of schemas for correct type
// inference, which doesn't survive mapping over SUPPORTED_STEP_TYPES cleanly.
// Each variant below still reuses that array's configSchema by index, so the
// *shape* of each config can't drift from supportedStepTypes.ts — only this
// short list of 5 entries is written by hand, to satisfy Zod's tuple requirement.
const manualTriggerNode = z.object({
  tempId: z.string().min(1).max(40),
  category: z.literal("trigger"),
  type: z.literal("trigger.manual"),
  label: z.string().min(1).max(60),
  config: SUPPORTED_STEP_TYPES[0].configSchema,
});

const webhookTriggerNode = z.object({
  tempId: z.string().min(1).max(40),
  category: z.literal("trigger"),
  type: z.literal("trigger.webhook"),
  label: z.string().min(1).max(60),
  config: SUPPORTED_STEP_TYPES[1].configSchema,
});

const logNode = z.object({
  tempId: z.string().min(1).max(40),
  category: z.literal("action"),
  type: z.literal("action.log"),
  label: z.string().min(1).max(60),
  config: SUPPORTED_STEP_TYPES[2].configSchema,
});

const waitNode = z.object({
  tempId: z.string().min(1).max(40),
  category: z.literal("action"),
  type: z.literal("action.wait"),
  label: z.string().min(1).max(60),
  config: SUPPORTED_STEP_TYPES[3].configSchema,
});

const aiClassifyNode = z.object({
  tempId: z.string().min(1).max(40),
  category: z.literal("action"),
  type: z.literal("action.ai_classify"),
  label: z.string().min(1).max(60),
  config: SUPPORTED_STEP_TYPES[4].configSchema,
});

export const GeneratedNodeSchema = z.discriminatedUnion("type", [
  manualTriggerNode,
  webhookTriggerNode,
  logNode,
  waitNode,
  aiClassifyNode,
]);

export const MAX_GENERATED_NODES = 8;

export const GeneratedEdgeSchema = z.object({
  sourceTempId: z.string().min(1).max(40),
  targetTempId: z.string().min(1).max(40),
});

export const GeneratedWorkflowSchema = z.object({
  nodes: z.array(GeneratedNodeSchema).min(1).max(MAX_GENERATED_NODES),
  edges: z.array(GeneratedEdgeSchema).max(MAX_GENERATED_NODES - 1),
});

export const AiGenerationResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ok"), workflow: GeneratedWorkflowSchema }),
  z.object({ status: z.literal("unsupported"), reason: z.string().min(1).max(500) }),
]);

export type GeneratedNode = z.infer<typeof GeneratedNodeSchema>;
export type GeneratedEdge = z.infer<typeof GeneratedEdgeSchema>;
export type GeneratedWorkflow = z.infer<typeof GeneratedWorkflowSchema>;
export type AiGenerationResponse = z.infer<typeof AiGenerationResponseSchema>;

// A looser, flatter JSON Schema handed to Groq's `response_format` as a guide for
// the model. Provider structured-output modes don't cleanly express discriminated
// unions with conditionally-required fields, so this is intentionally permissive —
// Zod (above) remains the real enforcement layer, re-validated after every call
// regardless of what this schema "guarantees" at the provider level.
export const GENERATION_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["ok", "unsupported"] },
    workflow: {
      type: "object",
      properties: {
        nodes: {
          type: "array",
          maxItems: MAX_GENERATED_NODES,
          items: {
            type: "object",
            properties: {
              tempId: { type: "string" },
              category: { type: "string", enum: ["trigger", "action"] },
              type: { type: "string", enum: SUPPORTED_STEP_TYPES.map((t) => t.type) },
              label: { type: "string" },
              config: { type: "object" },
            },
            required: ["tempId", "category", "type", "label", "config"],
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sourceTempId: { type: "string" },
              targetTempId: { type: "string" },
            },
            required: ["sourceTempId", "targetTempId"],
          },
        },
      },
      required: ["nodes", "edges"],
    },
    reason: { type: "string" },
  },
  required: ["status"],
} as const;
