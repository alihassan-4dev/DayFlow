import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { VoicePhase } from '../../data/types';
import { useTheme } from '../../theme/ThemeContext';

interface VoiceOrbProps {
  phase: VoicePhase;
  /** 0..1 microphone level while listening (drives the halo). */
  level: Animated.Value;
  size?: number;
  onPress?: () => void;
}

/**
 * The centre of voice mode. One living object that tells you what's going on
 * without a single word:
 *  listening — a halo that swells with your voice
 *  thinking  — three motes orbiting the core
 *  speaking  — the core itself pulses with the reply
 *  idle      — a slow breath, waiting for a tap
 */
export function VoiceOrb({ phase, level, size = 190, onPress }: VoiceOrbProps) {
  const { theme } = useTheme();
  const breath = useRef(new Animated.Value(0)).current;
  const orbit = useRef(new Animated.Value(0)).current;
  const talk = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  // Slow breathing — always on so the orb never feels frozen.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  // Thinking: orbiting motes.
  useEffect(() => {
    if (phase !== 'thinking') {
      orbit.stopAnimation();
      return;
    }
    orbit.setValue(0);
    const loop = Animated.loop(
      Animated.timing(orbit, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [phase, orbit]);

  // Speaking: a lively, slightly random pulse that reads as a voice.
  useEffect(() => {
    if (phase !== 'speaking') {
      Animated.timing(talk, { toValue: 0, duration: 260, useNativeDriver: true }).start();
      return;
    }
    let alive = true;
    const step = () => {
      if (!alive) return;
      const target = 0.25 + Math.random() * 0.75;
      Animated.timing(talk, {
        toValue: target,
        duration: 110 + Math.random() * 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => step());
    };
    step();
    const ring = Animated.loop(
      Animated.timing(wave, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    wave.setValue(0);
    ring.start();
    return () => {
      alive = false;
      ring.stop();
    };
  }, [phase, talk, wave]);

  const listening = phase === 'listening';
  const speaking = phase === 'speaking';

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const levelScale = level.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] });
  const talkScale = talk.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] });
  const haloScale = level.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.75] });
  const haloOpacity = level.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.08, 0.22, 0.45] });
  const halo2Scale = level.interpolate({ inputRange: [0, 1], outputRange: [1.02, 2.15] });
  const halo2Opacity = level.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.04, 0.1, 0.22] });
  const waveScale = wave.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const waveOpacity = wave.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.28, 0] });
  const spin = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const coreColors: [string, string] = speaking
    ? [theme.colors.aiB, theme.colors.aiA]
    : [theme.colors.aiA, theme.colors.aiB];
  const errorTint = phase === 'error';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        listening ? 'Stop listening and send' : speaking ? 'Interrupt' : 'Start talking'
      }
      onPress={onPress}
      style={[styles.wrap, { width: size * 2.3, height: size * 2.3 }]}
    >
      {/* Ambient glow */}
      <View
        style={[
          styles.abs,
          {
            width: size * 1.7,
            height: size * 1.7,
            borderRadius: size,
            backgroundColor: theme.colors.aiA,
            opacity: theme.dark ? 0.09 : 0.07,
          },
        ]}
      />

      {listening ? (
        <>
          <Animated.View
            style={[
              styles.abs,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: theme.colors.aiB,
                opacity: halo2Opacity,
                transform: [{ scale: halo2Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.abs,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: theme.colors.aiA,
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              },
            ]}
          />
        </>
      ) : null}

      {speaking ? (
        <Animated.View
          style={[
            styles.abs,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 1.5,
              borderColor: theme.colors.aiB,
              opacity: waveOpacity,
              transform: [{ scale: waveScale }],
            },
          ]}
        />
      ) : null}

      {phase === 'thinking' ? (
        <Animated.View
          style={[
            styles.abs,
            { width: size * 1.36, height: size * 1.36, transform: [{ rotate: spin }] },
          ]}
        >
          {[0, 120, 240].map((deg) => (
            <View
              key={deg}
              style={[
                styles.abs,
                styles.moteArm,
                { width: size * 1.36, height: size * 1.36, transform: [{ rotate: `${deg}deg` }] },
              ]}
            >
              <View style={[styles.mote, { backgroundColor: theme.colors.aiB }]} />
            </View>
          ))}
        </Animated.View>
      ) : null}

      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [
            { scale: breathScale },
            { scale: listening ? levelScale : 1 },
            { scale: speaking ? talkScale : 1 },
          ],
        }}
      >
        <LinearGradient
          colors={errorTint ? [theme.colors.danger, theme.colors.warning] : coreColors}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.85, y: 1 }}
          style={[styles.orb, { borderRadius: size / 2 }]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Inner dark pool gives the orb depth when it swells */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']}
            start={{ x: 0.5, y: 0.3 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  abs: { position: 'absolute' },
  orb: { flex: 1, overflow: 'hidden' },
  moteArm: { alignItems: 'center', justifyContent: 'flex-start' },
  mote: { width: 9, height: 9, borderRadius: 5, marginTop: 2 },
});
