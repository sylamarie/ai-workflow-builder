import { z } from "zod";

export const SUPPORTED_STEP_TYPES = [
  {
    category: "trigger",
    type: "trigger.manual",
    label: "Manual Trigger",
    configSchema: z.object({}).strict(),
    promptDescription: "Manual Trigger — starts a workflow with no input data. config: {}",
  },
  {
    category: "trigger",
    type: "trigger.webhook",
    label: "Webhook Trigger",
    configSchema: z.object({}).strict(),
    promptDescription:
      "Webhook Trigger — starts a workflow when an external HTTP request arrives. config: {}",
  },
  {
    category: "action",
    type: "action.log",
    label: "Log",
    configSchema: z.object({ message: z.string().min(1).max(300) }).strict(),
    promptDescription:
      'Log — writes a fixed, static text message to the run log (it cannot insert other steps\' dynamic output into the message — just write a sensible static message describing what happened, e.g. "Complaint logged" or "Classification complete"). config: { "message": string }',
  },
  {
    category: "action",
    type: "action.wait",
    label: "Wait",
    configSchema: z.object({ ms: z.number().int().min(0).max(60000) }).strict(),
    promptDescription:
      'Wait — pauses for a number of milliseconds before the next step. config: { "ms": number }',
  },
  {
    category: "action",
    type: "action.ai_classify",
    label: "AI Classify",
    configSchema: z
      .object({ categories: z.array(z.string().min(1).max(40)).min(2).max(8) })
      .strict(),
    promptDescription:
      'AI Classify — uses AI to classify incoming text into one of several categories you choose. config: { "categories": string[] } (2-8 category names)',
  },
] as const;

export type SupportedStepType = (typeof SUPPORTED_STEP_TYPES)[number];
export type SupportedStepTypeName = SupportedStepType["type"];
