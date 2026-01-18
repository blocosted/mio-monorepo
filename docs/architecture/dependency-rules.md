# Dependency Rules

## Allowed

- API → shared
- API → db
- Web → shared

## Forbidden

- shared → api
- shared → db
- domain → infrastructure

Violations are considered architecture bugs.
