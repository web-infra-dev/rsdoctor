---
name: rstack-docs-writer
description: Write or revise Markdown and MDX documentation, including READMEs, guides, and Rspress-based docs.
metadata:
  internal: true
---

# Rstack docs writer

Follow the project's existing documentation conventions.

## Writing

- Explain user-facing behavior concisely, adding details and examples only when they help users configure or use the feature.
- Keep common abbreviations such as `dev server`.
- Keep documentation in sync across locales when changing content. Use English as the default language unless the project specifies another.
- Use sentence-case headings.

## Page descriptions

Page frontmatter `description` is reused in search metadata and `llms.txt`.

- Summarize the page's actual scope using concrete APIs, tasks, and distinguishing topics, rather than one paragraph or example.
- State the overall purpose first. When using examples to clarify scope, make clear that they are representative, not exhaustive.
- Distinguish related configuration and API pages. Include version, stability, or environment constraints when they affect applicability.
- Use one complete plain-text sentence. Avoid generic templates, unsupported claims, truncation, and padding to meet a character count.
- Match the page's language and keep descriptions equivalent across locales.

## Heading anchors

- Prefer Rspress's default anchors for headings in the default locale; preserve intentional existing custom IDs.
- Determine generated anchors from heading `id` attributes: run the project's docs dev command and inspect the rendered browser DOM, or run its docs build command and inspect the generated HTML.
- Match headings in other locales to the default locale's anchors, using the project's locale mapping to pair pages. Add custom IDs where defaults differ; remove redundant IDs only if anchors stay unchanged.
- Escape custom IDs in MDX: `## Localized heading \{#default-locale-anchor}`.
- When anchors change, update corresponding IDs across locales and affected Markdown links and JSX `href` attributes. Check target pages before replacing hashes.
- Check changed links against their target headings.
