# Clean Architecture

Mio strictly follows Clean Architecture principles.

## Layers

- Domain: business rules, types, invariants
- Application: use cases and orchestration
- Infrastructure: external systems
- Presentation: API & UI

## Dependency rule

Dependencies always point inward.
The domain layer has zero knowledge of frameworks or databases.

## Why this matters

- Testability
- Long-term maintainability
- Ability to swap infrastructure
