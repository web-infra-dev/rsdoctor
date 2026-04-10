---
name: release-rsdoctor
description: Use when asked to release Rsdoctor packages for a specific version. All `@rsdoctor/*` packages (except `@rsdoctor/mcp-server`) are versioned together via changesets.
---

# Release Rsdoctor

## Input

- Target version, for example `1.5.8`

If the version is missing, ask for it before making changes.

## Steps

1. Check the worktree with `git status --short`. If there are uncommitted edits, stop and ask the user how to proceed.

2. Create and switch to branch `release_v<version>` (underscore, not slash). If the branch already exists, stop and ask the user how to proceed.

3. Run [changesets](https://github.com/changesets/changesets) to bump changed packages:

   ```sh
   pnpm changeset version
   ```

   All `@rsdoctor/*` packages (except `@rsdoctor/mcp-server`) move together as a fixed group — see `.changeset/config.json`.

4. Review the diff. Confirm version bumps are correct across packages and `pnpm-lock.yaml` is updated.

5. Commit with this exact message: `release: v<version>`

6. Push the branch, then create a GitHub PR with `gh pr create`. Use the same text for the PR title: `release: v<version>`

7. If `.github/PULL_REQUEST_TEMPLATE.md` exists, keep its structure.
   Fill it with:
   - `Summary`: `Release @rsdoctor/* packages v<version>.`
   - `Related Links`: `https://github.com/web-infra-dev/rsdoctor/releases/tag/v<version>`

8. After the PR is created, a maintainer will run the [release GitHub Action](https://github.com/web-infra-dev/rsdoctor/actions/workflows/release.yml) to publish to npm, then merge the PR to `main`.
