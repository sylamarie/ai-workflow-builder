import { beforeEach, describe, expect, it, vi } from "vitest";

const executeQueryMock = vi.fn();

vi.mock("../db/driver.js", () => ({
  driver: { executeQuery: (...args: unknown[]) => executeQueryMock(...args) },
}));

const { runWorkflow } = await import("./execution.service.js");
const { HttpError } = await import("../middleware/errorHandler.js");

function fakeRecord(data: Record<string, unknown>) {
  return { get: (key: string) => data[key] };
}

function nodeRecord(props: Record<string, unknown>) {
  return fakeRecord({ n: { properties: props } });
}

function baseNodeProps(overrides: Record<string, unknown>) {
  return {
    workflowId: "wf1",
    config: "{}",
    positionX: 0,
    positionY: 0,
    createdAt: "t1",
    ...overrides,
  };
}

// getWorkflow (called internally by runWorkflow) makes 3 executeQuery calls in order:
// (1) find the workflow, (2) fetch nodes, (3) fetch edges.
function mockGetWorkflowCalls(nodeRecords: ReturnType<typeof nodeRecord>[], edgeRecords: ReturnType<typeof fakeRecord>[]) {
  executeQueryMock.mockResolvedValueOnce({
    records: [fakeRecord({ w: { properties: { id: "wf1", name: "Test", createdAt: "t1", updatedAt: "t1" } } })],
  });
  executeQueryMock.mockResolvedValueOnce({ records: nodeRecords });
  executeQueryMock.mockResolvedValueOnce({ records: edgeRecords });
}

beforeEach(() => {
  executeQueryMock.mockReset();
});

describe("runWorkflow", () => {
  it("throws HttpError(400) when the workflow has no trigger node", async () => {
    mockGetWorkflowCalls(
      [nodeRecord(baseNodeProps({ id: "n1", category: "action", type: "action.log", label: "Log" }))],
      [],
    );

    const err = await runWorkflow("wf1").catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(400);
  });

  it("returns a status:error result for an unregistered step type", async () => {
    mockGetWorkflowCalls(
      [
        nodeRecord(baseNodeProps({ id: "trigger1", category: "trigger", type: "trigger.manual", label: "Start" })),
        nodeRecord(
          baseNodeProps({ id: "action1", category: "action", type: "action.not_real", label: "Mystery" }),
        ),
      ],
      [fakeRecord({ source: "trigger1", target: "action1" })],
    );

    const result = await runWorkflow("wf1");
    expect(result.status).toBe("error");
    expect(result.steps.at(-1)?.error).toMatch(/No handler registered for step type/);
  });

  it("runs a simple 2-node linear workflow successfully", async () => {
    mockGetWorkflowCalls(
      [
        nodeRecord(baseNodeProps({ id: "trigger1", category: "trigger", type: "trigger.manual", label: "Start" })),
        nodeRecord(
          baseNodeProps({
            id: "action1",
            category: "action",
            type: "action.log",
            label: "Log it",
            config: JSON.stringify({ message: "hello" }),
          }),
        ),
      ],
      [fakeRecord({ source: "trigger1", target: "action1" })],
    );

    const result = await runWorkflow("wf1");
    expect(result.status).toBe("success");
    expect(result.steps).toHaveLength(2);
  });
});
