import { describe, expect, it } from "vitest";
import { validateLinearWorkflow } from "./generation.validation.js";

describe("validateLinearWorkflow", () => {
  it("accepts a valid linear chain", () => {
    const nodes = [
      { tempId: "a", category: "trigger" as const },
      { tempId: "b", category: "action" as const },
      { tempId: "c", category: "action" as const },
    ];
    const edges = [
      { sourceTempId: "a", targetTempId: "b" },
      { sourceTempId: "b", targetTempId: "c" },
    ];
    expect(validateLinearWorkflow(nodes, edges)).toEqual({ ok: true });
  });

  it("rejects zero trigger nodes", () => {
    const nodes = [{ tempId: "a", category: "action" as const }];
    const result = validateLinearWorkflow(nodes, []);
    expect(result.ok).toBe(false);
  });

  it("rejects more than one trigger node", () => {
    const nodes = [
      { tempId: "a", category: "trigger" as const },
      { tempId: "b", category: "trigger" as const },
    ];
    const result = validateLinearWorkflow(nodes, []);
    expect(result.ok).toBe(false);
  });

  it("rejects an edge referencing an unknown node", () => {
    const nodes = [
      { tempId: "a", category: "trigger" as const },
      { tempId: "b", category: "action" as const },
    ];
    const edges = [{ sourceTempId: "a", targetTempId: "does-not-exist" }];
    const result = validateLinearWorkflow(nodes, edges);
    expect(result.ok).toBe(false);
  });

  it("rejects a node branching into more than one next step", () => {
    const nodes = [
      { tempId: "a", category: "trigger" as const },
      { tempId: "b", category: "action" as const },
      { tempId: "c", category: "action" as const },
    ];
    const edges = [
      { sourceTempId: "a", targetTempId: "b" },
      { sourceTempId: "a", targetTempId: "c" },
    ];
    const result = validateLinearWorkflow(nodes, edges);
    expect(result.ok).toBe(false);
  });

  it("rejects a node with more than one incoming connection", () => {
    const nodes = [
      { tempId: "a", category: "trigger" as const },
      { tempId: "b", category: "action" as const },
      { tempId: "c", category: "action" as const },
    ];
    const edges = [
      { sourceTempId: "a", targetTempId: "c" },
      { sourceTempId: "b", targetTempId: "c" },
    ];
    const result = validateLinearWorkflow(nodes, edges);
    expect(result.ok).toBe(false);
  });

  it("rejects an orphaned node not reachable from the trigger", () => {
    const nodes = [
      { tempId: "a", category: "trigger" as const },
      { tempId: "b", category: "action" as const },
      { tempId: "c", category: "action" as const },
    ];
    const edges = [{ sourceTempId: "a", targetTempId: "b" }];
    const result = validateLinearWorkflow(nodes, edges);
    expect(result.ok).toBe(false);
  });

  it("rejects a cycle instead of hanging", () => {
    const nodes = [
      { tempId: "a", category: "trigger" as const },
      { tempId: "b", category: "action" as const },
    ];
    const edges = [
      { sourceTempId: "a", targetTempId: "b" },
      { sourceTempId: "b", targetTempId: "a" },
    ];
    const result = validateLinearWorkflow(nodes, edges);
    expect(result.ok).toBe(false);
  });
});
