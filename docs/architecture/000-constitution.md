# ADR-000: Evendor Software Architecture Constitution

**Status:** Accepted  
**Date:** 2026-06-28

## Context

Evendor is evolving from a marketplace into an event commerce platform. Without enforced architecture, business logic duplicates across dashboards and becomes unmaintainable at scale.

## Decision

Adopt a **Domain-Driven Modular Monolith** with:

- Bounded contexts as engines under `src/core/`
- Platform kernel: auth, audit, events, config, notifications
- Single source of truth per capability
- Event-driven side effects
- Incremental migration — no big-bang rewrites

## Consequences

- New features must use engines, not duplicate logic
- API routes stay thin (auth → application service → engine)
- `@/lib/*` re-exports preserved for backward compatibility
- Full layered folders (presentation/application/domain/infrastructure) introduced per module as touched

## First rule

Analyze → report → plan → **approve** → implement incrementally. App must work after every phase.
