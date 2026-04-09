---
name: pr-creator
description: Use when asked to create a pull request for the Rsdoctor repository. Ensures the PR follows branch safety rules, Conventional Commits title convention, the project's PR template, and concise English writing style.
---

# Pull Request Creator

## Steps

1. Confirm the current branch with `git branch --show-current`.
   If it is `main`, create and switch to a new branch before doing anything else.
   Use a descriptive branch name, for example `feat/add-xxx` or `fix/resolve-xxx`.

2. Review local changes with `git status --short`.
   Do not revert unrelated user changes.
   Before creating the PR, ensure the intended changes are committed and never commit directly on `main`.

3. Read `.github/PULL_REQUEST_TEMPLATE.md` and keep its structure exactly. The template has two sections:
   - `## Summary`
   - `## Related Links`

4. Draft the PR title in **Conventional Commits** format. Common scopes for Rsdoctor:
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

5. Write the PR body in concise, clear English.
   - In `Summary`, explain the user-facing problem or maintenance goal first, then the main change.
   - Keep it short: one compact paragraph or 2-4 bullets is usually enough.
   - Focus on what changed and why it matters; avoid low-signal implementation detail.
   - Good background examples:
     - `This PR adds support for custom logger injection so CLI output can be isolated per instance.`
     - `This PR fixes incorrect padding in URL labels to keep terminal output aligned across different label lengths.`
     - `This PR updates the English docs to clarify how the extraction option works and when to enable it.`

6. Fill `Related Links` with issue links, design docs, related PRs, or discussion pages.
   If the PR upgrades an npm dependency, add a link to the upgraded version's release notes or tag page when available.
   If there is no relevant link, leave a short note such as `None`.

7. Push the branch only after re-checking the branch name. Never push `main` directly.

8. Create the PR with `gh pr create`.
