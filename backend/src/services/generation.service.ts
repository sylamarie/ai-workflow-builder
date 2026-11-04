import { generateWorkflowCompletion } from "../ai/groqClient.js";
import {
  AiGenerationResponseSchema,
  GENERATION_RESPONSE_JSON_SCHEMA,
} from "../ai/generation.schema.js";
import { buildGenerationMessages, GENERATION_MAX_TOKENS, GENERATION_TEMPERATURE } from "../ai/generation.prompt.js";
import { validateLinearWorkflow } from "../ai/generation.validation.js";
import { HttpError } from "../middleware/errorHandler.js";
import type { GeneratedEdge, GeneratedNode } from "../ai/generation.schema.js";

export const MAX_DESCRIPTION_LENGTH = 500;

export type GenerateWorkflowResult =
  | { status: "ok"; workflow: { nodes: GeneratedNode[]; edges: GeneratedEdge[] } }
  | { status: "unsupported"; reason: string };

export async function generateWorkflow(description: string): Promise<GenerateWorkflowResult> {
  const messages = buildGenerationMessages(description);

  let raw: string;
  try {
    raw = await generateWorkflowCompletion(
      messages,
      GENERATION_RESPONSE_JSON_SCHEMA,
      GENERATION_MAX_TOKENS,
      GENERATION_TEMPERATURE,
    );
  } catch (err) {
    console.error("Groq generation call failed:", err);
    throw new HttpError(502, "The AI service is unavailable right now. Please try again.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("AI returned unparseable JSON for workflow generation:", raw);
    throw new HttpError(
      422,
      "The AI generated an invalid workflow structure. Please try rephrasing your description.",
    );
  }

  const result = AiGenerationResponseSchema.safeParse(parsed);
  if (!result.success) {
    console.warn("AI response failed schema validation:", raw, result.error.flatten());
    throw new HttpError(
      422,
      "The AI generated an invalid workflow structure. Please try rephrasing your description.",
    );
  }

  if (result.data.status === "unsupported") {
    return { status: "unsupported", reason: result.data.reason };
  }

  const { nodes, edges } = result.data.workflow;
  const linearCheck = validateLinearWorkflow(nodes, edges);
  if (!linearCheck.ok) {
    console.warn("AI-generated workflow failed linearity check:", linearCheck.reason, raw);
    throw new HttpError(422, `The AI generated an invalid workflow: ${linearCheck.reason}`);
  }

  return { status: "ok", workflow: { nodes, edges } };
}
