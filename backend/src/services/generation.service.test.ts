import { beforeEach, describe, expect, it, vi } from "vitest";

const generateWorkflowCompletionMock = vi.fn();

// First vi.mock precedent in this repo — Vitest hoists vi.mock calls above imports
// automatically, so this works even though it's written after the mock function
// declaration above. The module being mocked is referenced by its import specifier
// exactly as generation.service.ts imports it.
vi.mock("../ai/groqClient.js", () => ({
  generateWorkflowCompletion: (...args: unknown[]) => generateWorkflowCompletionMock(...args),
}));

const { generateWorkflow } = await import("./generation.service.js");
const { HttpError } = await import("../middleware/errorHandler.js");

beforeEach(() => {
  generateWorkflowCompletionMock.mockReset();
});

describe("generateWorkflow", () => {
  it("returns a parsed, valid success result", async () => {
    const validPayload = {
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
    generateWorkflowCompletionMock.mockResolvedValueOnce(JSON.stringify(validPayload));

    const result = await generateWorkflow("log something after starting");
    expect(result).toEqual(validPayload);
  });

  it("throws a 422 HttpError when the AI returns malformed JSON", async () => {
    generateWorkflowCompletionMock.mockResolvedValueOnce("not valid json {{{");

    await expect(generateWorkflow("anything")).rejects.toMatchObject({
      status: 422,
    });
  });

  it("throws a 502 HttpError when the Groq call itself fails", async () => {
    generateWorkflowCompletionMock.mockRejectedValueOnce(new Error("network error"));

    const err = await generateWorkflow("anything").catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(502);
  });
});
