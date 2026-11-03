import { useEffect, useState } from "react";
import * as api from "./api";
import type { WorkflowSummary } from "./types";

interface WorkflowListProps {
  onOpenWorkflow: (workflowId: string) => void;
}

export function WorkflowList({ onOpenWorkflow }: WorkflowListProps) {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    api
      .listWorkflows()
      .then(setWorkflows)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const workflow = await api.createWorkflow(newName.trim());
      setNewName("");
      refresh();
      onOpenWorkflow(workflow.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="page">
      <h1>AI Workflow Builder</h1>

      <form className="create-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New workflow name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit">Create</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul className="workflow-list">
          {workflows.map((wf) => (
            <li key={wf.id}>
              <button className="workflow-item" onClick={() => onOpenWorkflow(wf.id)}>
                <span className="workflow-name">{wf.name}</span>
                <span className="workflow-meta">
                  {wf.nodeCount} node{wf.nodeCount === 1 ? "" : "s"} · updated{" "}
                  {new Date(wf.updatedAt).toLocaleString()}
                </span>
              </button>
            </li>
          ))}
          {workflows.length === 0 && <p>No workflows yet — create one above.</p>}
        </ul>
      )}
    </div>
  );
}
