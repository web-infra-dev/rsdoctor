---
name: release-rsdoctor
description: Use when asked to release Rsdoctor packages for a specific version. All publishable `@rsdoctor/*` packages under `packages/` (except `@rsdoctor/agent-cli`) are versioned together as a fixed group.
---

# Release Rsdoctor

## Input

- Target version, for example `1.5.8`

If the version is missing, ask for it before making changes.

## Steps

1. Check the worktree with `git status --short`. If there are uncommitted edits, stop and ask the user how to proceed.

2. Create and switch to branch `release_v<version>` (underscore, not slash). If the branch already exists, stop and ask the user how to proceed.

3. Set every publishable package under `packages/` to the target version, except `@rsdoctor/agent-cli`:

   ```sh
   pnpm --filter './packages/*' \
     --filter '!@rsdoctor/agent-cli' \
     exec npm pkg set 'version=<version>'
   ```

   These packages always move together as a fixed group, even if only one package changed. Do not update private tooling workspaces outside `packages/`.

4. Regenerate the lockfile from the updated package manifests:

   ```sh
   pnpm install --lockfile-only
   ```

5. Review the diff. Confirm every package in the fixed group has exactly the target version, `@rsdoctor/agent-cli` is unchanged, and `pnpm-lock.yaml` is updated.

6. Commit with this exact message: `release: v<version>`

7. Push the branch, then create a GitHub PR with `gh pr create`. Use the same text for the PR title: `release: v<version>`

8. If `.github/PULL_REQUEST_TEMPLATE.md` exists, keep its structure.
   Fill it with:
   - `Summary`: `Release v<version>.`
   - `Related Links`: `https://github.com/web-infra-dev/rsdoctor/releases/tag/v<version>`
