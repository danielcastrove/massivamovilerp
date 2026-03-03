---
name: testing-orchestrator
description: Centralizes and automates the execution of unit, integration, and e2e tests for the MassivaMovil.ERP project. Use when the user requests to "run tests", "verify the flow", or "perform a health check" on a specific module (CRM, Invoicing, BCV).
---

# Testing Orchestrator

This skill provides a structured workflow for verifying the integrity of MassivaMovil.ERP.

## Core Workflows

### 1. Verification of New Features
Before marking a task as complete, run its associated unit tests and a check for linting/typing.

- **Unit tests**: `npm test <path_to_test>`
- **Linting**: `npm run lint`
- **Type checking**: `npx tsc --noEmit`

### 2. E2E CRM / Customer Onboarding
To verify the full KYC flow (9 steps) and user association:

1. Use `scripts/seed-full-customers.ts` to prepare a known state.
2. Run `npm test src/components/customers/`.
3. Manually verify the 409 Conflict logic (association prompt) if applicable.

### 3. BCV & Financial Logic
Verify that the scraping and currency conversion are accurate:

1. Run `npx ts-node scripts/live-test-bcv.ts`.
2. Run `npm test src/app/api/cron/bcv`.
3. Check `invoices` table calculations.

## Test Command Reference
For a complete map of commands and their purposes, see [references/test-commands.md](references/test-commands.md).

## Guidelines for New Tests
- Use **Jest** and **React Testing Library**.
- Follow the **AAA pattern** (Arrange, Act, Assert).
- Mock external dependencies like `prisma` and `next-auth` using established patterns in `jest.setup.js`.
- For API routes, mock the `Request` and `Response` objects.
