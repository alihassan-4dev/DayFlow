import { Redirect } from 'expo-router';
import React from 'react';

// UI-only build: always start at the welcome screen.
// Once auth exists, this will branch on session + onboarding state.
export default function Index() {
  return <Redirect href="/(auth)/welcome" />;
}
