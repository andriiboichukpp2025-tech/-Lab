# CI/CD

Workflow запускається після push у `main` або вручну. Перед використанням Vercel додайте у GitHub Secrets:

- `VERCEL_TOKEN`;
- `VERCEL_ORG_ID`;
- `VERCEL_PROJECT_ID`.

GitHub Actions спочатку запускає `npm test`, а деплой виконується лише після успіху тестів.
