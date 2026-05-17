# AgentFix

**Autonomous AI Agent Security Testing & Self-Improvement Platform**

A system that analyzes AI agent prompt packs for vulnerabilities, launches adversarial red-team attacks using a 600+ payload dataset, generates hardened prompts using Gemini 2.5 Flash, and re-tests until secure—all without human intervention.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Vertex AI](https://img.shields.io/badge/Vertex_AI-Gemini_2.5_Flash-orange)](https://cloud.google.com/vertex-ai)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [The Core Loop](#the-core-loop)
- [Architecture](#architecture)
- [Features](#features)
- [Attack Categories](#attack-categories)
- [Reliability Scoring](#reliability-scoring)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Configuration](#configuration)

---

## Overview

AI agents are vulnerable to prompt injection, jailbreaks, social engineering, and instruction leakage. AgentFix provides autonomous security hardening through:

- **Prompt Analysis** — Detect 50+ issue types across security, performance, maintainability, and AI-specific risks
- **Adversarial Red-Teaming** — Run 600+ curated attack payloads from HuggingFace's `prompt_injection_dataset`
- **AI-Powered Fixes** — Gemini 2.5 Flash analyzes failures and generates hardened prompt packs
- **Self-Improve Loop** — Re-test iteratively until all attacks pass or max iterations reached
- **Live Probe** — Test your prompt pack against a real live Vertex AI agent instance
- **Observability** — Track every Vertex AI call with latency, token usage, and error capture

---

## The Core Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELF-IMPROVE LOOP                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐  │
│  │ ANALYZE  │──▶│  ATTACK  │──▶│ IMPROVE  │──▶│  RE-TEST   │  │
│  │ PROMPT   │   │ (600+    │   │(Gemini   │   │            │  │
│  │ PACK     │   │ payloads)│   │ 2.5)     │   │            │  │
│  └──────────┘   └──────────┘   └──────────┘   └─────┬──────┘  │
│       ▲                                              │         │
│       │                  ┌───────────┐               │         │
│       └──────────────────│  FAILED?  │◀──────────────┘         │
│                          └─────┬─────┘                         │
│                                │ NO                            │
│                                ▼                               │
│                         ┌───────────┐                          │
│                         │  SECURE   │                          │
│                         └───────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              AGENTFIX                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         FRONTEND (Next.js)                        │  │
│  │                                                                   │  │
│  │  Playground │ Research │ Reports │ Docs / Observability           │  │
│  │                                                                   │  │
│  │  • PromptPack editor (8 sections)                                 │  │
│  │  • Attack Mode — live red-team with profile selection             │  │
│  │  • Self-Improve — iterative loop with vulnerability reduction %   │  │
│  │  • Live Probe — real Vertex AI agent conversation testing         │  │
│  │  • Report export — formatted markdown to PDF                      │  │
│  │  • Observability dashboard — call logs, latency, token usage      │  │
│  └─────────────────────────────┬─────────────────────────────────────┘  │
│                                │ HTTP REST                               │
│  ┌─────────────────────────────▼─────────────────────────────────────┐  │
│  │                      API LAYER (Next.js Routes)                   │  │
│  │                                                                   │  │
│  │  /api/analyze        /api/attack           /api/improve           │  │
│  │  /api/improve-verify /api/retest           /api/report            │  │
│  │  /api/ask            /api/research         /api/observability     │  │
│  └─────────────────────────────┬─────────────────────────────────────┘  │
│                                │                                         │
│  ┌─────────────────────────────▼─────────────────────────────────────┐  │
│  │                         CORE LIBRARY                              │  │
│  │                                                                   │  │
│  │  vertex-ai.ts          — Gemini 2.5 Flash client (SSE streaming)  │  │
│  │  observability.ts      — Vertex AI call logger                    │  │
│  │  prompt-validation.ts  — PromptPack schema validation             │  │
│  │  mock-data.ts          — Dev/demo scenarios                       │  │
│  │  verification/retest.ts — Re-test harness                         │  │
│  │  vertex/textAgentRunner.ts — Live Probe agent runner              │  │
│  │  data/prompt_injection_dataset.csv — 600+ HuggingFace payloads    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                │                                         │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │
                    ┌────────────▼───────────┐
                    │    Google Vertex AI     │
                    │  Gemini 2.5 Flash       │
                    │                        │
                    │  • Prompt analysis     │
                    │  • Attack generation   │
                    │  • Fix synthesis       │
                    │  • Research Q&A        │
                    │  • Report generation   │
                    └────────────────────────┘
```

### Data Flow

```
┌────────┐     ┌──────────┐     ┌────────────┐     ┌───────────┐
│ Client │     │ Next.js  │     │ vertex-ai  │     │ Vertex AI │
└───┬────┘     └────┬─────┘     └─────┬──────┘     └─────┬─────┘
    │               │                 │                   │
    │  POST /api/improve-verify        │                   │
    │──────────────▶│                 │                   │
    │               │  runHealVerify()│                   │
    │               │────────────────▶│                   │
    │               │                 │  streamGenerate() │
    │               │                 │──────────────────▶│
    │               │                 │   SSE stream      │
    │               │                 │◀──────────────────│
    │               │                 │                   │
    │               │                 │  [if failures]    │
    │               │                 │  generateFix()    │
    │               │                 │──────────────────▶│
    │               │                 │   improved pack   │
    │               │                 │◀──────────────────│
    │               │                 │                   │
    │               │                 │  ┌─────────────────────────────┐
    │               │                 │  │  LOOP UNTIL PASS OR MAX     │
    │               │                 │  │  IMPROVEMENT ITERATIONS     │
    │               │                 │  └─────────────────────────────┘
    │               │  HealVerifyResult│                  │
    │               │◀────────────────│                   │
    │  JSON response│                 │                   │
    │◀──────────────│                 │                   │
```

---

## Features

### Prompt Analysis
- 50+ issue types across 5 categories: security, maintainability, performance, functionality, style
- AI-specific risks: prompt injection risk, hallucination-prone patterns, weak guardrails, unclear role
- Per-issue severity (critical / high / medium / low / informational) with confidence score
- Section-level attribution to the exact PromptPack field

### Attack Mode
- 20 attack categories including prompt injection, jailbreak, social engineering, data leakage, tool misuse
- 3 simulation profiles: `context-identity`, `system-boundaries`, `tool-exploitation`
- Multi-turn attack support (1–3 turns per scenario)
- 600+ adversarial payloads sourced from HuggingFace `prompt_injection_dataset`
- Live Probe option: attacks run against a real Vertex AI agent instance

### Self-Improve (Improve & Verify)
- Gemini 2.5 Flash analyzes failed attacks and synthesizes a hardened prompt pack
- Configurable max iterations (default 5)
- Per-iteration view: attack results, changes made, vulnerability reduction %, reliability score
- Stops early when all attacks pass

### Reliability Scoring
13-dimension scoring (0–100 each) — see [Reliability Scoring](#reliability-scoring)

### Research Assistant
- Ask Gemini 2.5 Flash about AI agent security topics
- Returns recommended steps, implementation guidance, and suggested prompt wording

### Report Generation
- Full developer report: issues found, attacks tested, before/after comparison, remaining risks
- Rendered as formatted markdown with PDF export via browser print dialog

### Observability Dashboard
- Real-time log of every Vertex AI call: operation type, model, status, latency (ms), token counts
- Aggregate stats: total calls, success/error counts, total duration
- Toggle on/off from the UI

---

## Attack Categories

| Category | Description |
|---|---|
| `prompt-injection` | Hidden instructions embedded in user input |
| `jailbreak` | DAN / pretend / "ignore previous" attacks |
| `social-engineering` | Authority claims, urgency, trust manipulation |
| `data-leakage` | Attempts to extract system prompt or internal data |
| `tool-misuse` | Exploiting tool-use permissions beyond scope |
| `missing-confirmation` | Actions that should require confirmation but don't |
| `unsupported-request` | Requests outside defined agent scope |
| `intent-change` | Mid-conversation pivot to malicious goal |
| `confused-user` | Exploiting ambiguity in agent instructions |
| `angry-user` | Emotional pressure to bypass guardrails |
| `ambiguous-request` | Edge-case inputs that reveal weak defaults |
| `repeated-pressure` | Persistence attacks across multiple turns |
| `hallucination-risk` | Prompts that encourage fabrication |
| `escalation-failure` | Bypassing escalation rules |
| `fallback-loop` | Triggering infinite fallback cycles |
| `policy-violation` | Exploiting loopholes in stated policies |
| `instruction-leakage` | Extracting confidential system instructions |
| `unsafe-execution` | Triggering unsafe tool/code execution |
| `over-sharing` | Getting the agent to share more than permitted |
| `recovery-failure` | Breaking post-error conversation recovery |

---

## Reliability Scoring

Overall score (0–100) composed of 13 weighted dimensions:

| Dimension | What it measures |
|---|---|
| Role Clarity | How clearly the agent's persona and purpose is defined |
| Instruction Clarity | Unambiguous, consistent directive phrasing |
| Fallback Handling | Graceful response to unsupported or unclear requests |
| Tool Use Safety | Scope constraints and permission boundaries for tools |
| Confirmation Behavior | Appropriate check-ins before consequential actions |
| Escalation Behavior | Correct escalation to humans when required |
| Prompt Injection Resistance | Robustness against embedded malicious instructions |
| Conversation Recovery | Ability to recover cleanly after errors or attacks |
| Unsupported Request Handling | Refusal quality for out-of-scope requests |
| Hallucination Resistance | Grounding and factual accuracy constraints |
| Scope Control | Prevention of scope creep and boundary violations |
| Refusal/Redirect Quality | Helpful, non-harmful refusals with alternatives |
| Sensitive Data Protection | Prevention of credential/PII leakage |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Google Cloud project with Vertex AI enabled
- Vertex AI API Key **or** Application Default Credentials (ADC)

### 1. Clone & Install

```bash
git clone https://github.com/Srijan88/agentfix.git
cd agentfix
npm install
```

### 2. Configure Environment

```bash
# .env.local
VERTEX_AI_API_KEY=your-google-cloud-api-key   # Express Mode (recommended for Vercel)
# OR configure ADC locally:
# gcloud auth application-default login
```

### 3. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

### 4. Quick API Test

```bash
# Connectivity check
curl http://localhost:3000/api/test-vertex

# Run attack evaluation
curl -X POST http://localhost:3000/api/attack \
  -H "Content-Type: application/json" \
  -d '{
    "promptPack": {
      "systemPrompt": "You are a helpful assistant.",
      "developerPrompt": "",
      "toolUseInstructions": "",
      "fallbackBehavior": "",
      "escalationRules": "",
      "confirmationRules": "",
      "refusalRedirectRules": "",
      "agentBoundaries": ""
    },
    "selectedProfiles": ["context-identity", "system-boundaries"],
    "totalAttacksRequested": 5,
    "liveProbe": false
  }'
```

---

## API Reference

### REST Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/test-vertex` | GET | Vertex AI connectivity check |
| `/api/analyze` | POST | Static prompt pack analysis |
| `/api/attack` | POST | Run adversarial attack evaluation |
| `/api/improve` | POST | Generate improved prompt pack from failures |
| `/api/improve-verify` | POST | Full self-improve loop with verification |
| `/api/retest` | POST | Re-test an improved prompt pack |
| `/api/ask` | POST | Chat with Gemini about your prompt |
| `/api/research` | POST | Research AI security topics |
| `/api/report` | POST | Generate full developer report |
| `/api/observability` | POST | Log a Vertex AI call |

### PromptPack Schema

All endpoints that accept a `promptPack` require all 8 string fields:

```typescript
interface PromptPack {
  systemPrompt: string;          // Core agent identity and purpose
  developerPrompt: string;       // Developer-level instructions
  toolUseInstructions: string;   // Tool permissions and constraints
  fallbackBehavior: string;      // What to do when unsure
  escalationRules: string;       // When to hand off to a human
  confirmationRules: string;     // When to ask before acting
  refusalRedirectRules: string;  // How to decline and redirect
  agentBoundaries: string;       // Hard scope limits
}
```

### POST /api/attack

```json
{
  "promptPack": { "..." },
  "scenarios": [],
  "selectedProfiles": ["context-identity", "system-boundaries", "tool-exploitation"],
  "totalAttacksRequested": 14,
  "liveProbe": false,
  "attackTurns": 1
}
```

### POST /api/improve-verify

```json
{
  "promptPack": { "..." },
  "attackResults": [ "..." ],
  "maxIterations": 5
}
```

---

## Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16.2.6 | App Router, API routes, SSR |
| Language | TypeScript 5 | Type safety across all layers |
| Styling | Tailwind CSS 4 | Dark-theme utility CSS |
| AI | Gemini 2.5 Flash (Vertex AI) | Analysis, attacks, fixes, research |
| Auth | google-auth-library | OAuth ADC + API Key (Express Mode) |
| Utilities | clsx, tailwind-merge | Class composition |
| Dataset | HuggingFace prompt_injection_dataset | 600+ adversarial payloads |
| Deployment | Vercel | Edge-optimized Next.js hosting |

---

## Project Structure

```
agentfix/
├── app/
│   ├── page.tsx                    # Main dashboard UI (single-page app)
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Dark theme global styles
│   └── api/
│       ├── analyze/route.ts        # Prompt pack static analysis
│       ├── attack/route.ts         # Adversarial attack evaluation
│       ├── improve/route.ts        # Prompt improvement generation
│       ├── improve-verify/route.ts # Self-improve + verify loop
│       ├── retest/route.ts         # Re-test after improvement
│       ├── ask/route.ts            # Conversational assistant
│       ├── research/route.ts       # Security research queries
│       ├── report/route.ts         # Developer report generation
│       ├── observability/route.ts  # Call log ingestion
│       └── test-vertex/route.ts    # Connectivity check
│
├── lib/
│   ├── vertex-ai.ts                # Gemini 2.5 Flash client (SSE + JSON parsing)
│   ├── observability.ts            # Vertex AI call logger
│   ├── prompt-validation.ts        # PromptPack schema validator
│   ├── mock-data.ts                # Dev/demo scenarios
│   ├── utils.ts                    # Shared utilities
│   ├── verification/
│   │   └── retest.ts               # Re-test harness
│   ├── vertex/
│   │   └── textAgentRunner.ts      # Live Probe agent runner
│   └── data/
│       └── prompt_injection_dataset.csv  # 600+ HuggingFace attack payloads
│
├── types/
│   └── index.ts                    # All TypeScript interfaces
│
├── public/                         # Static assets
├── .env.local                      # Environment variables (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VERTEX_AI_API_KEY` | Yes (Express Mode) | Google Cloud API key for Vertex AI |
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes (ADC Mode) | Path to service account JSON |

> **Express Mode** (`VERTEX_AI_API_KEY`) is recommended for Vercel deployments. **ADC Mode** is for local development via `gcloud auth application-default login`.

### Simulation Profiles

| Profile | What it tests |
|---|---|
| `context-identity` | Role confusion, persona manipulation, identity attacks |
| `system-boundaries` | Instruction leakage, boundary violations, scope creep |
| `tool-exploitation` | Tool permission abuse, unsafe execution, over-sharing |

---

## Deployment (Vercel)

1. Push repo to GitHub
2. Import at [vercel.com](https://vercel.com)
3. Add environment variable: `VERTEX_AI_API_KEY`
4. Deploy — auto-deploys on every push to `main`

---

## Built With

- [Google Vertex AI](https://cloud.google.com/vertex-ai) — Gemini 2.5 Flash for all AI operations
- [HuggingFace prompt_injection_dataset](https://huggingface.co/datasets/deepset/prompt-injections) — Adversarial attack corpus
- [Next.js](https://nextjs.org) — React framework for production
- [IBM watsonx Orchestrate / Bob](https://www.ibm.com/products/watson-orchestrate) — AI development assistant

---

## License

MIT License — see [LICENSE](LICENSE) for details.
