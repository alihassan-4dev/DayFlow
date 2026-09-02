import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { brand } from '../theme/brand';
import { type } from '../theme/themes';
import { DayFlowMark } from './brand/DayFlowMark';

/**
 * Takes over from the native splash the instant fonts are ready.
 * The mark is already on screen (same size, same spot as the native splash
 * image), so there's no flash — it simply comes alive: a light ring blooms
 * out, the wordmark rises, and the whole thing dissolves into the app.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const ring = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const markScale = useRef(new Animated.Value(1)).current;
  const word = useRef(new Animated.Value(0)).current;
  const overlay = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const bloom = (v: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

    Animated.sequence([
      Animated.parallel([
        bloom(ring, 0),
        bloom(ring2, 220),
        Animated.sequence([
          Animated.spring(markScale, { toValue: 1.06, useNativeDriver: true, speed: 6, bounciness: 8 }),
          Animated.spring(markScale, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 4 }),
        ]),
        Animated.sequence([
          Animated.delay(250),
          Animated.timing(word, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.delay(320),
      Animated.timing(overlay, {
        toValue: 0,
        duration: 480,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [ring, ring2, markScale, word, overlay, onDone]);

  const ringStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.6] }) }],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: overlay }]} pointerEvents="none">
      <LinearGradient colors={[...brand.splash]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.flex}>
        <View style={styles.center}>
          <Animated.View style={[styles.ring, ringStyle(ring)]} />
          <Animated.View style={[styles.ring, ringStyle(ring2)]} />
          <Animated.View style={{ transform: [{ scale: markScale }] }}>
            <DayFlowMark size={200} />
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.wordWrap,
            {
              opacity: word,
              transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
            },
          ]}
        >
          <Animated.Text style={[type.display, styles.word]}>DayFlow</Animated.Text>
          <Animated.Text style={[type.caption, styles.tagline]}>A calmer way through your day</Animated.Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: '#7FC8F0',
  },
  wordWrap: { position: 'absolute', left: 0, right: 0, top: '62%', alignItems: 'center' },
  word: { color: '#F4F5FF', fontSize: 34, lineHeight: 42, letterSpacing: 0.4 },
  tagline: { color: '#9AA3D6', marginTop: 6, letterSpacing: 0.3 },
});
