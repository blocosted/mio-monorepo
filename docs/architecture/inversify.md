# Inversify Dependency Injection

Mio uses Inversify for dependency injection in the API.

## Why

- Explicit dependencies
- Easy mocking
- Decoupled services

## Rules

- All services have interfaces
- No `new` inside handlers
- Services are registered in a single container
