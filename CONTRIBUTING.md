# Rsdoctor contribution guide

Thank you for your interest in contributing to Rsdoctor. Before starting your contribution, please take a moment to read the following guidelines.

---

## Setup the environment

### Fork the repo

[Fork](https://help.github.com/articles/fork-a-repo/) this repository to your
own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local.

### Install Node.js

We recommend using Node.js 22. You can check your currently used Node.js version with the following command:

```bash
node -v
```

If you do not have Node.js installed in your current environment, you can use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to install it.

Here is an example of how to install the Node.js 22 LTS version via nvm:

```bash
# Install the LTS version of Node.js 22
nvm install 22 --lts

# Make the newly installed Node.js 22 as the default version
nvm alias default 22

# Switch to the newly installed Node.js 22
nvm use 22
```

### Install pnpm

Enable [pnpm](https://pnpm.io/) with corepack:

```sh
corepack enable
```

Install dependencies:

```sh
pnpm install
```

What this will do:

- Install all dependencies.
- Create symlinks between packages in the monorepo.
- Run the `prepare` script to build all packages, powered by [nx](https://nx.dev/).

### Set git email

Please make sure you have your email set up in https://github.com/settings/emails. This will be needed later when you want to submit a pull request.

Check that your git client is already configured the email:

```sh
git config --list | grep email
```

Set the email to global config:

```sh
git config --global user.email "SOME_EMAIL@example.com"
```

Set the email for local repo:

```sh
git config user.email "SOME_EMAIL@example.com"
```

---

## Making changes and building

Once you have set up the local development environment in your forked repo, we can start development.

### Checkout a new branch

It is recommended to develop on a new branch, as it will make things easier later when you submit a pull request:

```sh
git checkout -b MY_BRANCH_NAME
```

### Build the package

Use [nx build](https://nx.dev/nx-api/nx/documents/run) to build the package you want to change:

```sh
npx nx build @rsdoctor/core
```

Build all packages:

```sh
pnpm run build
```

---

## Startup Rsdoctor client

When you make changes to the code and want to view the `Rsdoctor` analysis report, you can execute `build:analysis` in the `examples/foo` project to see it:

```sh
pnpm run build:analysis
```

- Based on the **Webpack** project: `modern-minimal` and `webpack-minimal`.
- Based on the **Rspack** project: `rspack-minimal` and `rsbuild-minimal`.

---

## Testing

### Add new tests

If you've fixed a bug or added code that should be tested, then add some tests.

You can add unit test cases in the `<PACKAGE_DIR>/tests` folder. The test syntax is based on [Vitest](https://vitest.dev/).

### Run unit tests

Before submitting a pull request, it's important to make sure that the changes haven't introduced any regressions or bugs. You can run the unit tests for the project by executing the following command:

```sh
pnpm run test
```

Alternatively, you can run the unit tests of single package using the `--filter` option:

```sh
pnpm run --filter @rsdoctor/some-package test
```

### Run E2E tests

In addition to the unit tests, the Rsdoctor also includes end-to-end (E2E) tests, which checks the functionality of the application as a whole.

You can run the `test:e2e` command to run the E2E tests:

```sh
pnpm run e2e
```

## Linting

To help maintain consistency and readability of the codebase, we use [Biome](https://github.com/biomejs/biome) to lint the codes.

You can run the Linter by executing the following command:

```sh
pnpm run lint
```

For VS Code users, you can install the [Biome VS Code extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) to see lints while typing.

---

## Documentation

Currently Rsdoctor provides documentation in English and Chinese. If you can use Chinese, please update both documents at the same time. Otherwise, just update the English documentation.

You can find all the documentation in the `document` folder:

```bash
root
└─ document
```

This website is built with Rspress, the document content can be written using markdown or mdx syntax. You can refer to the [Rspress Website](https://rspress.dev/) for detailed usage.

---

## Submitting changes

### Committing your changes

Commit your changes to your forked repo, and [create a pull request](https://help.github.com/articles/creating-a-pull-request/).

### Format of PR titles

The format of PR titles follow Conventional Commits.

An example:

```
feat(plugin-swc): Add `newOption` config
^    ^    ^
|    |    |__ Subject
|    |_______ Scope
|____________ Type
```

---

## Benchmarking

You can input `!bench` in the comment area of the PR to do benchmarking on `rsdoctor` (you need to have Collaborator and above permissions).

You can focus on metrics related to build time and bundle size based on the comparison table output by comments to assist you in making relevant performance judgments and decisions.

Dependencies installation-related metrics base on publishing process, so the data is relatively lagging and is for reference only.

---

## Releasing

Repository maintainers can publish a new version of changed packages to npm.

1. Checkout a new release branch, for example `release_v1.2.0`
2. Run [changesets](https://github.com/changesets/changesets) to bump changed packages and commit the changes.
3. Create a pull request, the title should be `release: v1.2.0`.
4. Run the [release action](https://github.com/web-infra-dev/rsdoctor/actions/workflows/release.yml) to publish packages to npm.
5. Merge the release pull request to `main`.
6. Generate the [release notes](https://github.com/web-infra-dev/rsdoctor/releases) via GitHub, see [Automatically generated release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)
