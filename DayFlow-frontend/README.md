# DayFlow Frontend

React Native / Expo SDK 54 app connected to the DayFlow FastAPI backend. Tasks
live in the backend; preferences persist in AsyncStorage and sync to the backend.

## Run

```powershell
npm install
npm start
```

Set `EXPO_PUBLIC_API_URL` for EAS builds:

```powershell
eas env:set --name EXPO_PUBLIC_API_URL --value https://your-api.fastapicloud.dev --environment production --visibility plaintext
```

Remote push notifications are unavailable in Expo Go. Test with an EAS
development/preview build on a real device.

## Firebase / Android push setup

1. On the free Firebase Spark plan, create a project and add an Android app with
   the exact package `com.alihassancodes.dayflow`.
2. Download `google-services.json` into this directory. `app.json` already points
   to it. This client configuration is not the private server credential.
3. In Firebase **Project settings > Service accounts**, generate a private key.
   Do not commit it or paste it into chat. Upload it directly to Expo using
   `eas credentials`: Android > production > Google Service Account > FCM V1.
4. Confirm the Firebase Cloud Messaging API (HTTP v1) is enabled.
5. Build: `eas build --profile preview --platform android`.

The app receives an Expo push token and registers it with the authenticated
FastAPI backend. Firebase is only Android's delivery transport; scheduling,
tasks, user preferences, and every generated message remain in the backend.

## Useful checks

```powershell
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android
```

Voice controls and real password-reset email delivery are not yet implemented.
