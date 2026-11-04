import { describe, expect, it } from "vitest";
import { AiGenerationResponseSchema } from "./generation.schema.js";

describe("AiGenerationResponseSchema", () => {
  it("accepts a valid success payload", () => {
    const payload = {
      status: "ok",
      workflow: {
        nodes: [
          { tempId: "a", category: "trigger", type: "trigger.manual", label: "Start", config: {} },
          {
            tempId: "b",
            category: "action",
            type: "action.log",
            label: "Log it",
            config: { message: "done" },
          },
        ],
        edges: [{ sourceTempId: "a", targetTempId: "b" }],
      },
    };
    expect(AiGenerationResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("accepts a valid unsupported payload", () => {
    const payload = { status: "unsupported", reason: "needs branching logic" };
    expect(AiGenerationResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("rejects an unknown step type", () => {
    const payload = {
      status: "ok",
      workflow: {
        nodes: [
          {
            tempId: "a",
            category: "trigger",
            type: "trigger.not_real",
            label: "Start",
            config: {},
          },
        ],
        edges: [],
      },
    };
    expect(AiGenerationResponseSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects action.wait missing its ms config field", () => {
    const payload = {
      status: "ok",
      workflow: {
        nodes: [
          {
            tempId: "a",
            category: "action",
            type: "action.wait",
            label: "Wait",
            config: {},
          },
        ],
        edges: [],
      },
    };
    expect(AiGenerationResponseSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects more than the max allowed nodes", () => {
    const nodes = Array.from({ length: 9 }, (_, i) => ({
      tempId: `n${i}`,
      category: "action" as const,
      type: "action.log" as const,
      label: "Log",
      config: { message: "x" },
    }));
    const payload = { status: "ok", workflow: { nodes, edges: [] } };
    expect(AiGenerationResponseSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects a payload with neither a recognized status", () => {
    const payload = { status: "maybe", reason: "unclear" };
    expect(AiGenerationResponseSchema.safeParse(payload).success).toBe(false);
  });
});
