# AI Workflow Builder

A simplified workflow-automation builder (a mini n8n/Zapier) — build visual workflows where a
trigger flows through steps, including a real AI classification step powered by Claude, to
produce a result.

## Why this project exists

Most "AI automation" portfolio pieces just connect a few steps in an existing no-code tool. This
project instead builds a simplified version of that kind of tool from scratch, to demonstrate an
understanding of how automation platforms work internally: workflow storage, execution order, and
AI-step integration.

Workflows are modeled as graphs (steps = nodes, order = relationships) and stored in Neo4j, which
is a natural fit — not just a stack choice for its own sake.

## Stack

- **Backend:** Node + Express + TypeScript
- **Frontend:** React + `@xyflow/react` (drag-and-drop canvas)
- **Database:** Neo4j AuraDB (free tier)
- **AI:** Claude API (`@anthropic-ai/sdk`, Haiku 4.5)

## Status

🚧 In development — see `backend/README.md` (once added) for local dev setup.

## License

MIT
