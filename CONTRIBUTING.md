# Contributing to hiero-schedule

Thank you for your interest in contributing. This document describes how to get started and what is expected of contributors.

## Developer Certificate of Origin (DCO)

All contributions must be signed off under the [Developer Certificate of Origin](https://developercertificate.org/). This certifies that you wrote the code or have the right to submit it under the Apache 2.0 license.

Add a `Signed-off-by` trailer to every commit:

```
git commit -s -m "feat: add schedule:sign command"
```

Which produces:

```
feat: add schedule:sign command

Signed-off-by: Your Name <your@email.com>
```

Commits without a `Signed-off-by` line will not be merged.

## GPG Signed Commits

All commits in this repository must be GPG signed. Configure Git to sign your commits before opening a pull request:

```bash
# Generate a key if you don't have one
gpg --full-generate-key

# List your keys and copy the key ID
gpg --list-secret-keys --keyid-format=long

# Tell Git to use it
git config --global user.signingkey <your-key-id>
git config --global commit.gpgsign true

# Export the public key and add it to your GitHub account
gpg --armor --export <your-key-id>
```

Add the exported public key at **GitHub → Settings → SSH and GPG keys → New GPG key**.

Commits without a GPG signature will not be merged.

## Getting Started

```bash
git clone https://github.com/hiero-ledger/hiero-schedule.git
cd hiero-schedule
npm install
npm test          # all tests must pass before opening a PR
npm run type-check
```

## Contribution Workflow

1. **Fork** the repository and create a feature branch from `main`.
2. Make your changes. Keep commits small and focused.
3. Add or update **unit tests** for any changed behaviour.
4. Run `npm test` and `npm run type-check` — both must pass cleanly.
5. Sign off each commit with `git commit -s`.
6. Open a **Pull Request** against `main` with a clear description of what and why.

## Code Style

- TypeScript strict mode is enforced (`"strict": true` in `tsconfig.json`).
- Follow the existing file layout: one command per directory under `commands/`, with `input.ts`, `output.ts`, `handler.ts`, and `index.ts`.
- Input validation belongs in `input.ts` Zod schemas; error handling belongs in the handler's `try/catch`.
- Do not mock the Hedera SDK at integration-test level; unit tests mock at the boundary only.

## What to Contribute

- Bug fixes and edge-case handling in existing commands
- Additional commands for other Hedera scheduled transaction operations
- Improvements to the `lifecycle.ts` state model
- Documentation improvements

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]

Signed-off-by: Your Name <your@email.com>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.

## Reporting Issues

Open a GitHub Issue with a clear description of the problem and steps to reproduce. Include the output of `hiero schedule:status` if the issue relates to live network behaviour.

## License

By contributing you agree that your work will be licensed under the [Apache License 2.0](LICENSE).
