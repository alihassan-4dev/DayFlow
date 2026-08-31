# DayFlow — Frontend

Premium AI-powered daily task manager connected to the DayFlow FastAPI backend.
Authentication, task CRUD, AI chat, local preferences, and local task reminders
are wired. Voice controls and real password-reset email delivery are not implemented.

Stack: React Native · Expo SDK 54 · TypeScript · Expo Router · npm

## Run

```bash
npm install
npm start        # then press a (Android), i (iOS), or scan the QR in Expo Go
```

For EAS builds, create `EXPO_PUBLIC_API_URL` in each EAS environment you use.
The build profiles in `eas.json` select `development`, `preview`, and `production`
explicitly. For example:

```bash
eas env:set --name EXPO_PUBLIC_API_URL --value https://your-api.fastapicloud.dev --environment production --visibility plaintext
```

## Structure

```
app/                     # Expo Router routes
  _layout.tsx            # Providers (theme, tasks, prefs) + fonts + root stack
  (auth)/                # welcome, login, signup, forgot-password
  onboarding.tsx         # 3-step personalization
  (main)/                # Tab bar: tasks + ai (the only two main tabs)
  task-editor.tsx        # Add/edit/delete task (modal)
  settings/              # Profile hub, appearance, notifications, AI prefs, voice
src/
  theme/                 # Theme system: 6 schemes + type/spacing tokens + context
  components/            # Reusable UI (Button, TextField, TaskCard, Chip, …)
  components/ai/         # AI identity: gradient orb, chat bubbles, typing dots
  state/                 # Backend-synced tasks and persisted local preferences
  data/                  # Shared types, defaults, suggestions, notif previews
  api/                   # Backend client, auth token storage, task mapping
  services/              # Local notification scheduling
  utils/                 # Formatting helpers
```

## Current limitations

- The voice settings UI is present, but speech recognition and spoken replies are not wired.
- Forgot-password calls the backend, but the backend does not yet send reset email.
- Task mutations are optimistic. Failed creates roll back, while failed updates
  and deletes re-sync from the backend and show the offline state when necessary.
- Themes and preferences persist in AsyncStorage. Tasks persist in the backend.
