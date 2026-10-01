# Who’s Called Grandma?

A family coordination app built with Expo, React Native, Expo Router, and Supabase.

## Local development

```bash
npm install
npx expo start --dev-client
```

Install a development build on your device before connecting to the development server. App screens live in `src/app`.

## Android test build

```bash
npx eas-cli@latest build --platform android --profile preview
```

The preview profile produces a standalone APK. Install the APK from that build’s download link on your Android device.

The development profile includes the development client; the production profile is for store builds. Build settings are in `eas.json`.

## Configuration

Keep local environment values in `.env`, which is ignored by Git. Configure the corresponding EAS environment values for cloud builds. Never commit credentials.

The invite test requires working Supabase configuration and a reachable invite website. Receiving devices also need a compatible app build to complete the in-app flow.
