# ADR-001: Modular Monolith (Not Microservices)

**Status:** Accepted  
**Date:** 2026-06-28

## Context

Evendor deploys as one Next.js app on Vercel. Microservices would add operational cost before product-market fit.

## Decision

- **Deploy:** single monolith
- **Design:** service-oriented modules (`src/core/*`) with clear boundaries
- **Future:** any module extractable to a microservice by moving its engine + repository

## Why

- Faster iteration for a small team
- Shared database transactions for booking + escrow + rewards
- Extraction path preserved via engines and event bus

## Implementation

- Phase 0 (2026-06-28): `src/core/*` engines + `@/lib` re-exports
- Phases 1–6: RBAC, audit, events, analytics consolidation
