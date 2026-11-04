import { beforeEach, describe, expect, it, vi } from "vitest";

const executeQueryMock = vi.fn();

vi.mock("../db/driver.js", () => ({
  driver: { executeQuery: (...args: unknown[]) => executeQueryMock(...args) },
}));

const { createWorkflow, addNode, addEdge } = await import("./workflow.service.js");
const { HttpError } = await import("../middleware/errorHandler.js");

function fakeRecord(data: Record<string, unknown>) {
  return { get: (key: string) => data[key] };
}

beforeEach(() => {
  executeQueryMock.mockReset();
});

describe("createWorkflow", () => {
  it("maps a Neo4j record into a Workflow", async () => {
    executeQueryMock.mockResolvedValueOnce({
      records: [
        fakeRecord({
          w: { properties: { id: "wf1", name: "Test", createdAt: "t1", updatedAt: "t1" } },
        }),
      ],
    });

    const result = await createWorkflow({ name: "Test" });
    expect(result).toEqual({ id: "wf1", name: "Test", createdAt: "t1", updatedAt: "t1" });
  });
});

describe("addNode", () => {
  it("JSON-stringifies config in the Cypher params passed to executeQuery", async () => {
    // findWorkflowOrThrow
    executeQueryMock.mockResolvedValueOnce({
      records: [
        fakeRecord({
          w: { properties: { id: "wf1", name: "Test", createdAt: "t1", updatedAt: "t1" } },
        }),
      ],
    });
    // the addNode CREATE query
    executeQueryMock.mockResolvedValueOnce({
      records: [
        fakeRecord({
          n: {
            properties: {
              id: "n1",
              workflowId: "wf1",
              category: "action",
              type: "action.log",
              label: "Log",
              config: JSON.stringify({ message: "hi" }),
              positionX: 0,
              positionY: 0,
              createdAt: "t1",
            },
          },
        }),
      ],
    });

    await addNode("wf1", {
      category: "action",
      type: "action.log",
      label: "Log",
      config: { message: "hi" },
      position: { x: 0, y: 0 },
    });

    const secondCallParams = executeQueryMock.mock.calls[1][1] as Record<string, unknown>;
    expect(secondCallParams.config).toBe(JSON.stringify({ message: "hi" }));
  });
});

describe("addEdge", () => {
  it("throws HttpError(404) when a referenced node is not found", async () => {
    // findWorkflowOrThrow
    executeQueryMock.mockResolvedValueOnce({
      records: [
        fakeRecord({
          w: { properties: { id: "wf1", name: "Test", createdAt: "t1", updatedAt: "t1" } },
        }),
      ],
    });
    // the addEdge MERGE query, no matching nodes
    executeQueryMock.mockResolvedValueOnce({ records: [] });

    const err = await addEdge("wf1", { sourceId: "a", targetId: "b" }).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(404);
  });
});
