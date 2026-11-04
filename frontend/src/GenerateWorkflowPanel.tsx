import { useState } from "react";
import * as api from "./api";
import type { GeneratedEdge, GeneratedNode } from "./types";

const MAX_DESCRIPTION_LENGTH = 500;

interface GenerateWorkflowPanelProps {
  onGenerated: (workflow: { nodes: GeneratedNode[]; edges: GeneratedEdge[] }) => void;
}

export function GenerateWorkflowPanel({ onGenerated }: GenerateWorkflowPanelProps) {
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "unsupported" | "success">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleGenerate() {
    const trimmed = description.trim();
    if (!trimmed) return;

    setStatus("loading");
    setMessage(null);

    try {
      const result = await api.generateWorkflow(trimmed);
      if (result.status === "unsupported") {
        setStatus("unsupported");
        setMessage(result.reason);
        return;
      }
      onGenerated(result.workflow);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="generate-panel">
      <div className="generate-panel-heading">Describe it, AI builds it</div>
      <textarea
        className="generate-textarea"
        placeholder='e.g. "When someone submits a complaint, classify it as urgent or normal, then log the result."'
        value={description}
        maxLength={MAX_DESCRIPTION_LENGTH}
        disabled={status === "loading"}
        onChange={(e) => {
          setDescription(e.target.value);
          if (status !== "idle" && status !== "loading") {
            setStatus("idle");
            setMessage(null);
          }
        }}
      />
      <div className="generate-panel-footer">
        <span className="char-counter">
          {description.length} / {MAX_DESCRIPTION_LENGTH}
        </span>
        <button onClick={handleGenerate} disabled={status === "loading" || !description.trim()}>
          {status === "loading" ? "Generating..." : "Generate Workflow"}
        </button>
      </div>

      {status === "error" && <p className="error">{message}</p>}
      {status === "unsupported" && (
        <p className="generate-unsupported">Can't build that: {message}</p>
      )}
      {status === "success" && (
        <p className="generate-success">
          Workflow generated below — review it, then Save or Discard.
        </p>
      )}
    </div>
  );
}
