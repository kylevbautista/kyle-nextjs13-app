# Kyle's Anime Tracking App — Project Documentation Index

**Generated:** 2026-03-15 | **Scan:** Exhaustive | **Mode:** Initial Scan

---

## Project Overview

- **Type:** Monolith (single-part web application)
- **Primary Language:** TypeScript
- **Framework:** Next.js 16.1.1 (App Router)
- **Architecture:** Component-based full-stack with SSG/ISR

## Quick Reference

- **Tech Stack:** Next.js 16 + React 19 + TypeScript + Tailwind CSS + MongoDB + NextAuth + Zustand + SWR
- **Entry Point:** `app/layout.tsx` (root layout)
- **Architecture Pattern:** Server/Client boundary components, SSG + ISR, REST API routes
- **Database:** MongoDB (Mongoose 6.8.1) — embedded document strategy
- **Auth:** OAuth via NextAuth.js (GitHub, Twitter, Google)
- **Hosting:** Vercel (auto-deploy from git)
- **External API:** AniList GraphQL (anime data source)

---

## Generated Documentation

- [Project Overview](./project-overview.md) — Executive summary, tech stack, key features
- [Architecture](./architecture.md) — Architecture patterns, data flow, rendering strategy, state management
- [Source Tree Analysis](./source-tree-analysis.md) — Annotated directory structure, critical folders, entry points
- [Component Inventory](./component-inventory.md) — All React components, hooks, and utilities categorized
- [API Contracts](./api-contracts.md) — REST endpoints, request/response schemas, auth flow
- [Data Models](./data-models.md) — MongoDB schemas, embedded document design, collections
- [Development Guide](./development-guide.md) — Prerequisites, setup, scripts, development patterns, troubleshooting

---

## Existing Documentation

- [README.md](../README.md) — Project introduction, feature list, future improvements

---

## Getting Started

1. **Understand the project:** Start with [Project Overview](./project-overview.md) for a high-level picture
2. **Explore the architecture:** Read [Architecture](./architecture.md) for technical design decisions
3. **Navigate the code:** Use [Source Tree Analysis](./source-tree-analysis.md) to find specific files
4. **Set up locally:** Follow [Development Guide](./development-guide.md) for environment setup
5. **Understand the API:** Review [API Contracts](./api-contracts.md) for endpoint details
6. **Review data design:** Check [Data Models](./data-models.md) for schema details
7. **Find components:** Browse [Component Inventory](./component-inventory.md) for reusable UI elements

---

## AI-Assisted Development Guidance

When working with AI tools on this codebase:

- **Adding features:** Reference Architecture and Component Inventory for existing patterns
- **API changes:** Consult API Contracts and Data Models for current schema
- **UI work:** Check Component Inventory for reusable components before creating new ones
- **Brownfield PRD:** All docs together provide sufficient context for planning new features on this codebase
