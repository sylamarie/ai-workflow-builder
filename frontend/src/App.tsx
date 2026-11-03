import { useState } from "react";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { WorkflowList } from "./WorkflowList";

export function App() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  if (selectedWorkflowId) {
    return (
      <WorkflowCanvas
        workflowId={selectedWorkflowId}
        onBack={() => setSelectedWorkflowId(null)}
      />
    );
  }

  return <WorkflowList onOpenWorkflow={setSelectedWorkflowId} />;
}
