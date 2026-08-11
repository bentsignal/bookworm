---
name: worm-expo-build
description: Build, install, and test the Worm Expo React Native app through local EAS development-client workflows. Use for iOS Simulator builds, physical iPhone development builds, Android development builds, Expo dev-client/Portless iteration, signing or provisioning diagnostics, and any task that might otherwise run Xcode or generated native projects directly. Always use local EAS builds unless the user explicitly requests a cloud build.
---

# Worm Expo Build

## Core rule

Treat `apps/mobile` as an Expo-managed app. Build and install native binaries through Expo and local EAS.

Do not use `expo run:ios`, `expo run:android`, Xcode, Gradle, or direct `xcodebuild` as the primary build workflow. Do not edit `apps/mobile/ios` or `apps/mobile/android` as source. Those folders are generated artifacts for inspection and temporary diagnostics only. Make native behavior changes through `app.config.ts`, Expo config plugins, `eas.json`, or package source.

Use XcodeBuildMCP after installing the local EAS simulator artifact to launch the app, inspect UI, collect logs, and interact with Simulator.

## App facts

- App directory: `apps/mobile`
- Expo config: `apps/mobile/app.config.ts`
- EAS config: `apps/mobile/eas.json`
- Slug and scheme: `worm`
- iOS bundle identifier: `com.bentsignal.worm`
- Android package: `com.bentsignal.worm`
- Simulator profile: `development:client:sim`
- Standalone physical-device profile: `development`
- Development-client physical-device profile: `development:client`

## Standard checks

Run from the repository root before or after meaningful build-facing changes:

```bash
pnpm --filter @worm/mobile lint
pnpm --filter @worm/mobile typecheck
```

Follow the repository `AGENTS.md` validation sequence after source changes.

## iOS Simulator workflow

Build the development client locally:

```bash
cd apps/mobile
pnpm dlx eas-cli@21.7.1 build --local --platform ios --profile development:client:sim --output ./build/worm-development-client-simulator.tar.gz
```

Extract the artifact, boot or select the requested Simulator through XcodeBuildMCP, install the `.app`, and launch it. Do not substitute a direct Xcode build for this EAS build.

Start Metro through the repository's Portless wrapper for JS iteration:

```bash
pnpm --filter @worm/mobile dev
```

The installed development client should connect to `https://mobile.worm.local`.

## Physical iPhone workflow

Confirm the paired device:

```bash
xcrun devicectl list devices
```

Build a standalone local EAS development `.ipa` with its JavaScript bundle
embedded:

```bash
cd apps/mobile
pnpm dlx eas-cli@21.7.1 build --local --platform ios --profile development --output ./build/worm-development.ipa
```

Install the verified IPA:

```bash
xcrun devicectl device install app --device <device-uuid> ./build/worm-development.ipa
```

For every other signing or provisioning issue, use EAS credentials, Expo
config, and EAS profiles. Never patch generated Xcode signing settings as the
solution.

## Android workflow

Use the existing `development:client:sim` profile for a local development-client APK unless another profile is explicitly requested:

```bash
cd apps/mobile
pnpm dlx eas-cli@21.7.1 build --local --platform android --profile development:client:sim --output ./build/worm-development-client.apk
```

Install the APK with Android tooling, then run Metro through the same Portless-backed mobile dev command.

## Reporting

Always report:

- Local or cloud EAS build
- EAS profile
- Artifact path and type (`.app` archive, `.ipa`, or `.apk`)
- Simulator or physical-device identifier used for installation
- Whether Metro used `https://mobile.worm.local`
- Whether Files app document sharing is present in the generated Info.plist
- Exact signing, provisioning, or device blocker
