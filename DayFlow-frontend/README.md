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

## Voice mode

The mic button (chat composer, or the floating mic on the Tasks screen) opens a
full-screen voice conversation:

1. **Listen** — `expo-audio` records mono AAC with metering on. The screen
   watches the level and ends the turn on its own after ~1.2 s of silence.
2. **Think** — one `POST /ai/voice` round trip: Groq Whisper transcribes the
   clip, the assistant answers (and can change tasks), and the backend returns
   the reply plus an MP3 spoken by a Microsoft Edge neural voice.
3. **Speak** — the MP3 plays; tap the orb to interrupt. With **Hands-free** on
   it goes straight back to listening.

If the backend has no audio for a reply (offline, or the "Device voice"
preference), `expo-speech` reads it with the phone's own voice. Everything said
also lands in the text chat.

Voice mode works in Expo Go. The microphone permission string lives in the
`expo-audio` plugin entry in `app.json`.

## Brand assets

Icons, splash, favicon and the notification glyph are generated from one vector
definition (`src/theme/brand.ts`); the in-app `DayFlowMark` component renders
the same geometry with `react-native-svg`, so the animated splash matches the
native one pixel for pixel.

Real password-reset email delivery is not yet implemented.
