# DayFlow — Frontend

Premium AI-powered daily task manager. **UI only** — no backend, auth, AI, voice, or notification services are connected yet; everything runs on mock data

Stack: React Native · Expo SDK 54 · TypeScript · Expo Router · npm

## Run

```bash
npm install
npm start        # then press a (Android), i (iOS), or scan the QR in Expo Go
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
  state/                 # TasksContext, PreferencesContext (in-memory, mock)
  data/                  # Types + mock tasks, canned AI replies, notif previews
  utils/                 # Formatting helpers
```

## Notes for future wiring

- `app/index.tsx` always redirects to welcome; branch on real session state later.
- Auth screens use `setTimeout` to fake network calls — replace with API calls.
- The AI screen's `send`/`toggleListening` in `app/(main)/ai.tsx` cycle canned replies from `src/data/mock.ts` — replace with AI + voice APIs.
- The AI orb (`src/components/ai/AIOrb.tsx`) already supports the four states: idle, listening, processing, responding.
- Theme choice persists via AsyncStorage; task/preference state is in-memory only.
