# Releasing

Merges to `main` trigger an automated release.

## Workflows

- **CI** (`.github/workflows/ci.yml`) — runs on every PR and push to `main`. It installs dependencies, runs `npm run build`, and runs `npm test`.
- **Publish** (`.github/workflows/publish.yml`) — runs after a non-release push to `main`. It builds, tests, bumps the patch version, pushes the bump commit and tag, and publishes to npm.

## Required secrets

Go to **Settings → Secrets and variables → Actions** in the GitHub repo and add:

- `NPM_TOKEN` — an npm access token with **Publish** permission for the `@ablea` scope. Create it at https://www.npmjs.com/settings/ablea/tokens.

No other secrets are needed. The workflow uses the built-in `GITHUB_TOKEN` to push the version bump and tag.

## Version bump behavior

- The workflow uses `npm version patch`, so every merge to `main` increments the patch version (`1.0.1` → `1.0.2`).
- The commit message is prefixed with `chore(release):`, and the publish workflow skips any push whose head commit already contains that text. This prevents an infinite release loop.

## Manual publish

If you ever need to publish manually:

```bash
npm version patch
npm publish --access public
```
