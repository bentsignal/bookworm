# AGENTS.md

## Repository Summary

lib is a local-first ebook library and workshop. The Expo mobile app is the
first client; format logic belongs in platform-neutral packages when practical.

## Product Rules

- Imported books and generated files stay in the app Documents directory so
  they remain visible through the iOS Files app.
- Keep the interface calm, compact, and native-feeling. Prefer platform
  navigation and controls over custom JavaScript imitations.
- Never mutate a user's source book in place. Exports are new files.
- The app must remain useful without an account, backend, or network access.

## Required Validation After Changes

Run these commands in order:

1. `pnpm run lint`
2. `pnpm run typecheck`
3. `pnpm run test`
4. `pnpm run format:fix`

Do not leave excessive comments. Add one only when the code cannot make the
decision clear on its own.
