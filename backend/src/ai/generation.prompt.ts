import { SUPPORTED_STEP_TYPES } from "./supportedStepTypes.js";

export const GENERATION_MAX_TOKENS = 1500;
export const GENERATION_TEMPERATURE = 0.1;

function buildSystemPrompt(): string {
  const stepList = SUPPORTED_STEP_TYPES.map((t) => `- ${t.promptDescription}`).join("\n");

  return [
    "You design simple, linear automation workflows: a single straight chain of steps, one after another, with no branching.",
    "You can ONLY use these step types:",
    stepList,
    "",
    "Return a JSON object only, no other text.",
    'If the request can be built with the steps above, return: { "status": "ok", "workflow": { "nodes": [...], "edges": [...] } }',
    'Each node needs: a short unique "tempId" string, a "category" ("trigger" or "action"), a "type" (one of the exact type strings listed above), a short human-readable "label", and a "config" object matching that type\'s shape exactly.',
    'Each edge connects two nodes: { "sourceTempId": "...", "targetTempId": "..." }.',
    "The workflow must be a single straight chain: exactly one trigger node, and each node leading to at most one next node — no branches, no loops, no node with more than one incoming connection.",
    "If the request genuinely cannot be represented with only these step types and a linear chain (for example it needs branching/conditional logic, or an integration that isn't listed above), do not invent a misleading or nonfunctional workflow. Instead return:",
    '{ "status": "unsupported", "reason": "<a short, clear, specific explanation>" }',
    "",
    "Do NOT mark a request unsupported just because a Log step's message can't literally contain another step's live output — Log messages are always static text, so simply write a sensible static message describing what happened at that point in the chain. That alone is never a reason to decline.",
    "",
    "Worked example:",
    'Request: "When someone submits a complaint, classify it as urgent or normal, then log the result."',
    "Correct response:",
    JSON.stringify({
      status: "ok",
      workflow: {
        nodes: [
          { tempId: "n1", category: "trigger", type: "trigger.webhook", label: "Complaint Submitted", config: {} },
          {
            tempId: "n2",
            category: "action",
            type: "action.ai_classify",
            label: "Classify Urgency",
            config: { categories: ["urgent", "normal"] },
          },
          {
            tempId: "n3",
            category: "action",
            type: "action.log",
            label: "Log Result",
            config: { message: "Complaint classified" },
          },
        ],
        edges: [
          { sourceTempId: "n1", targetTempId: "n2" },
          { sourceTempId: "n2", targetTempId: "n3" },
        ],
      },
    }),
  ].join("\n");
}

export interface GenerationMessage {
  role: "system" | "user";
  content: string;
}

export function buildGenerationMessages(description: string): GenerationMessage[] {
  return [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: description },
  ];
}
