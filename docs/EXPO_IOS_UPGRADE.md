# Expo and iOS Simulator Upgrade Log

Last updated: August 21, 2026

This document records the work completed while improving Budget Buddy, repairing its local web build, and upgrading its iOS development toolchain.

## Current project state

- Branch: `chore/upgrade-expo-55`
- Expo: SDK 55 (`^55.0.0`)
- React Native: `0.83.10`
- React: `19.2.0`
- Recommended local Node: `20.19.4`
- Selected developer directory: `/Applications/Xcode.app/Contents/Developer`
- Selected Xcode: `26.6`
- Native iOS project: generated under `ios/`
- TypeScript check: passing
- Model tests: 5 passing

## Application improvements completed

### UI and accessibility

- Increased the category quick-add touch target to 44 by 44 points.
- Added accessibility roles, labels, hints, and expanded state to budget category rows.
- Added accessible labels to transaction actions such as Log Again, Edit, and Delete.
- Corrected animated-background opacity for light themes.
- Disabled the native animation driver on web to avoid unsupported-driver warnings.
- Added animation cleanup when the background or category row unmounts.

### Features

- Connected the existing transaction `Again` action to a prefilled expense form.
- The repeated transaction is reviewed before it is saved, preventing accidental duplicate expenses.

### Performance

- Added a memoized category lookup map.
- Removed repeated full-category scans during transaction filtering, rendering, and expense-template resolution.
- Removed a duplicate Zustand-backed theme path from the animated background.
- The background now receives the active application theme directly.

### Data integrity and code quality

- Added strict month ID validation.
- Invalid restored dates, non-finite amounts, malformed limits, and orphan transactions are rejected or normalized.
- Invalid recent currency and language values no longer create fallback entries.
- The current month is created correctly when a restored backup contains only future budgets.
- PDF tooling is loaded only when PDF import/export is used, preventing it from breaking web startup.
- Added conventional `npm test` and `npm run check` scripts.
- Changed the test path from `tests/**/*.test.ts` to `tests/*.test.ts` for Node 20 compatibility.
- Expanded the model suite from 2 tests to 5 tests.

## Web setup and verification

The project declared an Expo web target but originally lacked its required runtime packages. The following dependencies were added and later aligned with the selected Expo SDK:

- `@expo/metro-runtime`
- `react-dom`
- `react-native-web`

The first production web bundle exposed two startup problems:

1. Zustand's development middleware emitted unsupported `import.meta` syntax in the Metro bundle.
2. Eagerly loading `pdf-lib` caused a TypeScript helper interoperability failure.

The duplicate theme store was removed from the runtime path and `pdf-lib` was changed to a dynamic import. After those changes, the production web export rendered successfully in a browser without console errors.

## Original iOS build failure

The first local build used Xcode 27 beta:

```text
/Applications/Xcode-beta.app/Contents/Developer
Xcode 27.0
```

The build failed for two separate toolchain compatibility reasons:

1. Xcode 27 rejected CocoaPods targets with iOS 13.0 or 13.4 deployment targets. The affected targets included RevenueCat, PurchasesHybridCommon, and AsyncStorage resources.
2. After temporarily overriding the deployment target to iOS 15, Xcode 27 failed to compile React Native 0.79's bundled `fmt` C++ library.

This confirmed that the failure was caused by using Expo SDK 53 and React Native 0.79 with an unsupported future Xcode compiler, not by the Budget Buddy application code.

## Toolchain decision

Two options were considered:

1. Install Xcode 16.4 and keep Expo SDK 53.
2. Upgrade Expo and React Native, then use the already-installed stable Xcode 26.6.

The project chose the second option so it would not depend on an older Xcode installation. Xcode was switched from the beta installation to:

```text
/Applications/Xcode.app/Contents/Developer
Xcode 26.6
```

## Upgrade history

### Accidental Expo 57 download

An upgrade command was initially run from `/Applications/Xcode-beta.app/Contents/Developer` instead of the project directory. Because no local `package.json` was available, `npx` temporarily downloaded Expo 57. This did not upgrade Budget Buddy; the project remained on Expo SDK 53.

The working directory was corrected to:

```text
/Users/rahulkumar/StudioProjects/budget_app
```

### Expo SDK 53 to SDK 54

Expo SDK 54 installed, but `expo install --fix` initially stopped with an npm peer-resolution error. React Native 0.81 required React 19.1 types while the project still declared React 19.0 types.

The recovery consisted of:

- Aligning `@types/react` with React 19.1.
- Aligning TypeScript with the SDK 54 recommendation.
- Completing a normal `npm install` without `--force` or `--legacy-peer-deps`.
- Updating all Expo and React Native dependencies to their SDK 54-compatible versions.
- Removing the duplicate `expo-file-system` installation.
- Changing the FileSystem import to `expo-file-system/legacy`, because the app uses the static FileSystem API moved under that compatibility entry point in Expo FileSystem 19.

After recovery, Expo Doctor passed 17 of 18 checks. The only remaining warning was expected because a generated `ios/` folder existed while the app also used Expo Prebuild configuration.

### Expo SDK 54 to SDK 55

The project has now advanced to Expo SDK 55 with:

```text
expo: ^55.0.0
react-native: 0.83.10
react: 19.2.0
```

Expo-managed packages were aligned to SDK 55 versions, and the native iOS project was regenerated. Current TypeScript and model checks pass.

## Current verification

Run from the project root with Node 20.19.4:

```bash
cd /Users/rahulkumar/StudioProjects/budget_app
nvm use 20.19.4
npm run check
```

Latest result:

```text
TypeScript: passed
Tests: 5 passed, 0 failed
```

## Remaining steps

Validate the final SDK 55 dependency and native configuration:

```bash
cd /Users/rahulkumar/StudioProjects/budget_app
nvm use 20.19.4
npx expo-doctor
```

Then build and install the development client:

```bash
open -a Simulator
npx expo run:ios --device
```

After the first successful installation, subsequent local runs can use:

```bash
npm run ios
```

## Important cautions

- Do not use Xcode 27 beta for this project until its Expo and React Native versions explicitly support that compiler.
- Do not use `npm install --force`, `--legacy-peer-deps`, or `npm audit fix --force` to bypass dependency problems.
- `npx expo prebuild --clean` regenerates the native project and can overwrite manual changes under `ios/`.
- npm currently reports dependency vulnerabilities. They have not been force-upgraded because doing so could introduce breaking native dependency changes; audit them separately.
- Always confirm `pwd` points to the Budget Buddy project before running Expo installation commands.

