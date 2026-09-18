# Example demos

The `deploy-examples.yml` workflow builds the selected examples and deploys these
static Rsdoctor reports to a dedicated Netlify site.

Configure the GitHub `netlify` environment with these secrets before enabling the
workflow:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_EXAMPLES_SITE_ID`

The reports are standalone HTML files, so the Netlify site does not need a build
command or redirects.
