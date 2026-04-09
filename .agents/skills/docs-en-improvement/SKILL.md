---
name: docs-en-improvement
description: Improve English documentation under `packages/document/docs/en` by rewriting unnatural translated sentences into clear, professional English while preserving meaning. Use when editing or polishing English docs in the Rsdoctor project.
---

# Docs En Improvement

Rsdoctor documentation is built with **Rspress** and lives in `packages/document/`. Content is written in Markdown / MDX.

## Steps

1. Focus on files in `packages/document/docs/en`.

2. Rewrite only sentences that clearly improve clarity, correctness, or naturalness in English.

3. Preserve original meaning exactly; do not introduce new claims or remove technical details.

4. If a file in `packages/document/docs/en` is updated, check the mirrored file in `packages/document/docs/zh` and apply equivalent updates when needed.

5. Preview changes locally with `cd packages/document && pnpm dev`.

## Constraints

- Limit each PR to 10 documentation files or fewer.
- Start PR titles with `docs:`.
- Keep reasonable technical abbreviations (for example, `dev server`).
- Keep wording simple and readable for non-native English readers.
- Use sentence case for Markdown headings.
- Rsdoctor-specific terms should stay consistent: Rsdoctor (capital R), Rspack, webpack (lowercase w), Rsbuild.
