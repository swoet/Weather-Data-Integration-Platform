# Contributing to Weather Data Integration Platform

Thank you for your interest! Maintained by [Shawn Mutogo](https://github.com/swoet).

## Getting Started

1. Fork the repo and clone your fork.
2. Create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Set up the project (see [README.md](README.md)).
4. Make changes with tests.
5. Run the test suite:
   ```bash
   pytest tests/ -v
   ```
6. Push and open a Pull Request against `main`.

## Commit Format (Conventional Commits)

```
feat: add 7-day forecast support
fix: handle empty city name gracefully
test: add boundary tests for alert threshold
security: restrict CORS origins
docs: improve .env.example documentation
chore: bump fastapi dependency
```

## Code Style

- Python: PEP 8. CI runs `ruff check` on every PR.
- Keep functions small. Add docstrings to public functions.

## Security Issues

Do not open public issues for security vulnerabilities.
Use a [private security advisory](https://github.com/swoet/Weather-Data-Integration-Platform/security/advisories/new) instead.