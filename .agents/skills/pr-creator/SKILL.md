---
name: pr-creator
description: Use when asked to create a pull request for the Rsdoctor repository. Ensures the PR follows branch safety rules, Conventional Commits title convention, the project's PR template, and concise English writing style.
---

# Pull Request Creator

## Steps

1. Confirm the current branch with `git branch --show-current`.
   Never make changes directly on `main` or `v1.x`.

2. Choose the PR target branch from the working branch base.
   If the working branch was created from `v1.x`, target `v1.x`; otherwise target `main`.
   For new work, use `main` by default. Use `v1.x` only for v1 releases, v1 backports, or v1-only changes.
   If the branch base is unclear, ask the user before creating the PR.

3. Before making changes or backports, update the target branch and create the working branch from it:
   `git fetch origin <target-branch>`
   `git switch <target-branch>`
   `git pull --ff-only origin <target-branch>`
   `git switch -c <working-branch>`
   Use a descriptive working branch name, for example `feat/add-xxx` or `fix/resolve-xxx`.
   Do not open a `main`-based branch with `gh pr create --base v1.x`; recreate or rebase it from `v1.x` first.

4. Review local changes with `git status --short`.
   Do not revert unrelated user changes.
   Before creating the PR, ensure the intended changes are committed and never commit directly on `main` or `v1.x`.

5. Read `.github/PULL_REQUEST_TEMPLATE.md` and keep its structure exactly. The template has two sections:
   - `## Summary`
   - `## Related Links`

6. Draft the PR title in **Conventional Commits** format. Common scopes for Rsdoctor:
   - `feat(core): add ...`
   - `fix(rspack-plugin): ...`
   - `fix(webpack-plugin): ...`
   - `feat(sdk): ...`
   - `feat(cli): ...`
   - `feat(ai): ...`
   - `docs: ...`
   - `refactor(graph): ...`
   - `chore(deps): ...`
   - `release: v1.5.8`

7. Write the PR body in concise, clear English.
   - In `Summary`, explain the user-facing problem or maintenance goal first, then the main change.
   - Keep it short: one compact paragraph or 2-4 bullets is usually enough.
   - Focus on what changed and why it matters; avoid low-signal implementation detail.
   - Good background examples:
     - `This PR adds support for custom logger injection so CLI output can be isolated per instance.`
     - `This PR fixes incorrect padding in URL labels to keep terminal output aligned across different label lengths.`
     - `This PR updates the English docs to clarify how the extraction option works and when to enable it.`

8. Fill `Related Links` with issue links, design docs, related PRs, or discussion pages.
   If the PR upgrades an npm dependency, add a link to the upgraded version's release notes or tag page when available.
   If there is no relevant link, leave a short note such as `None`.

9. Push the branch only after re-checking the branch name. Never push `main` or `v1.x` directly.

10. Create the PR with `gh pr create --base <target-branch>`.
