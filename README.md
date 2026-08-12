# Budget Buddy (Mobile App)

Budget Buddy is a simple Expo React Native app to help users track monthly budgets by category.

## Features

- Set a monthly budget limit per category
- Add, edit and remove expense entries
- View planned, spent, and remaining totals per category
- Monthly summary and simple charts
- Optional Firebase backup and authentication

## Getting started

Prerequisites:

- Node.js 18+ and npm
- Expo CLI (optional but recommended): `npm install -g expo-cli`

Install dependencies:

```bash
npm install
```

Run the app in development (Expo managed workflow):

```bash
npm start
# or
expo start
```

Open the app using Expo Go on your device or run on a simulator.

## Scripts

- `npm start` — Start the Expo development server
- `npm run android` — Run on Android emulator/device (if configured)
- `npm run ios` — Run on iOS simulator (macOS only)
- `npm run typecheck` — Run TypeScript type checks (if project uses TypeScript)

## Configuration

If using Firebase for optional backup and authentication, set these environment variables locally or in your build environment:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

For RevenueCat (iOS subscriptions) set:

- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`

Local example (start with a public RevenueCat key):

```bash
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_public_sdk_key npm start
```

## iOS release (example)

```bash
npm run build:ios
npm run submit:ios
```

Before submitting to the App Store, ensure:

- App Store Connect app created
- RevenueCat products and entitlements configured
- App icons and screenshots prepared
- Privacy/support URLs and App Store privacy details provided

## Contributing

Contributions, bug reports and feature requests are welcome. Please open an issue or submit a PR.

## License

This project is provided under the MIT License. See LICENSE for details.
