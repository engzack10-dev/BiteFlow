# BiteFlow AI Workflow

## Goal
Use AI to increase engineering speed without losing engineering control.

AI helps with analysis, implementation, testing and review. Humans remain responsible for requirements and architecture.

## Prompt framework
ROLE → TASK → FORMAT → CONTEXT → CONSTRAINTS → EVALUATION

ROLE: define the engineering role.
TASK: state one meaningful task.
FORMAT: define the expected output.
CONTEXT: list relevant docs, specs and existing code.
CONSTRAINTS: state technical, business and scope restrictions.
EVALUATION: define objective completion checks.

## Example
ROLE: Senior react/TypeScript engineer working on BiteFlow.
TASK: Implement the customer cart drawer according to its feature specification.
FORMAT: Plan, files to change, implementation, tests, summary.
CONTEXT: Read AGENTS.md, project overview, architecture, UI context, engineering standards and the cart spec.
CONSTRAINTS: Reuse existing components. Do not change checkout/payment behavior. Support light/dark mode. Do not invent requirements.
EVALUATION: Open/close works, quantities update, remove works, totals are correct, empty state works, TypeScript and tests pass.

## AI behavior
Before coding: inspect context, inspect existing code, identify dependencies, state assumptions.
During coding: focused changes, preserve behavior, avoid unnecessary dependencies.
After coding: validate, compare with evaluation criteria, report risks, update docs when needed.

Never ask AI to build the whole application in one step. Work feature by feature and task by task.
