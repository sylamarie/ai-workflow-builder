# AI Workflow Builder

A simplified workflow-automation builder (a mini n8n/Zapier) — build visual workflows where a
trigger flows through steps, including a real AI classification step, to produce a result.

**Live demo:** https://ai-workflow-builder-sylamarie.vercel.app
**Repo:** https://github.com/sylamarie/ai-workflow-builder

> Note: the backend runs on a free hosting tier that sleeps after 15 minutes of inactivity. The
> **first** request after a break can take 30–60 seconds to wake up — if the app seems stuck on
> load, give it a moment and it'll come through.

## Problem

Most "AI automation" portfolio projects demonstrate automation by *using* an existing no-code tool
(Zapier, n8n) to wire a few steps together. That proves you can use a tool — it doesn't prove you
understand how automation platforms actually work underneath: how a workflow is represented, how
execution order is determined, how an AI step fits into a pipeline, or how a trigger kicks off a
run safely.

## Approach

Instead of using an existing automation tool, this project builds a simplified version of one —
proving an understanding of the internals, not just the UI. Specifically:

- Workflows are modeled as **graphs**: each step is a node, each connection between steps is a
  relationship, stored in **Neo4j**. A workflow genuinely *is* a graph — this isn't a stack choice
  for its own sake, it's the correct data model for the problem.
- A small **execution engine** walks the graph from its trigger node, running each step in order
  through a plugin-style **handler registry** (the same architectural pattern real automation
  tools use internally).
- One step type calls a real AI model to classify text, and one trigger type is a real HTTP
  webhook — so a workflow can be kicked off by an external system, not just a button click.

## Architecture

```
┌─────────────┐        ┌──────────────────┐        ┌─────────────┐
│   Frontend   │ fetch  │      Backend      │ Cypher │   Neo4j     │
│  React +     │ ─────> │  Express + TS     │ ─────> │  AuraDB     │
│  React Flow  │ <───── │  (REST API +      │ <───── │  (graph     │
│  (Vercel)    │  JSON  │   execution       │        │   storage)  │
└─────────────┘        │   engine)          │        └─────────────┘
                        │  (Render)          │
                        └─────────┬─────────┘
                                  │ one step type
                                  ▼
                           ┌─────────────┐
                           │  Groq API   │
                           │ (AI classify)│
                           └─────────────┘
```

**Request flow for a run:** `Frontend → POST /:id/run or /:id/webhook → Backend loads the graph
from Neo4j → walks trigger → NEXT → NEXT ... → each step runs through its registered handler
(log / wait / AI classify) → full step log returned to the caller.`

## Key decisions & why

- **One `WorkflowNode` label with a `category`/`type` discriminator**, instead of separate
  `:Trigger`/`:Action` labels — avoids `UNION`-style queries when fetching "all nodes regardless
  of kind," and adding a new step type later is just a new `type` string, no schema migration.
- **A handler registry for step execution**, instead of a big `if/else` chain — new step types
  register themselves (`registerStepHandler("action.foo", handler)`), which is the same
  "plugin" shape real workflow engines use, and keeps the execution engine itself untouched when
  adding new capabilities.
- **AI provider is isolated to one module** (`src/ai/groqClient.ts`). The original plan used
  Claude directly; partway through the build, budget constraints meant pivoting to **Groq**
  (genuinely free, no card required) instead. Because the AI call was already isolated behind a
  single function, this swap took minutes, not a rewrite — and swapping in Claude later (or
  offering both) is similarly small.
- **Linear workflows only for v1.** The graph schema already supports branching (a node can have
  multiple outgoing `NEXT` relationships) without a migration, but the execution engine
  deliberately only walks a single chain for now — avoids solving a harder problem before the
  simpler one is proven.
- **Webhook protected by a shared-secret header**, checked before the workflow runs, not after —
  since the webhook is a public URL that triggers real (metered) AI API calls once deployed.

## Challenges

- **Account defaults changed mid-build.** The Neo4j AuraDB instance used here doesn't use the
  classic `neo4j` username/database — newer instances generate their own. The backend originally
  hardcoded `database: "neo4j"` for queries, which failed against this instance; fixed by letting
  the driver resolve the connection's home database automatically instead of assuming a name.
- **Budget constraint became a design decision.** Needing to swap the AI provider partway through
  (see above) ended up validating the "isolate the AI call" decision — it's a concrete example of
  a budget constraint being absorbed by an architecture choice instead of a scramble.
- **Free-tier hosting trade-off.** Render's free web service tier sleeps after 15 minutes idle,
  causing a 30–60s cold start on the next request. Documented above rather than hidden, since it's
  a real, common trade-off in freemium hosting — not a bug.

## What I'd improve next

- Branching workflows (if/else style), since the schema already supports it.
- Persisted run history (currently a run's log is only returned in the HTTP response, not stored).
- Swap/offer Claude as an AI provider option alongside Groq.
- A "waking up the server…" loading state in the UI for the Render cold-start case.

## Stack

- **Backend:** Node + Express + TypeScript, deployed on Render
- **Frontend:** React + `@xyflow/react` (drag-and-drop canvas), deployed on Vercel
- **Database:** Neo4j AuraDB (free tier)
- **AI:** Groq API (`groq-sdk`)

## Local development

```bash
# Backend
cd backend
npm install
cp .env.example .env   # fill in your own Neo4j AuraDB + Groq credentials
npm run dev             # http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev             # http://localhost:5173
```

## License

MIT
