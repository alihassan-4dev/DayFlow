import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { AIState } from '../../data/types';
import { useTheme } from '../../theme/ThemeContext';

interface AIOrbProps {
  state: AIState;
  size?: number;
}

/**
 * DayFlow's AI identity — a soft, luminous orb.
 * idle       — slow breathing
 * listening  — quicker pulse with an expanding halo
 * processing — tight pulse
 * responding — gentle steady glow
 */
export function AIOrb({ state, size = 120 }: AIOrbProps) {
  const { theme } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.stopAnimation();
    halo.stopAnimation();
    pulse.setValue(0);
    halo.setValue(0);

    const breathe = (duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    const anims: Animated.CompositeAnimation[] = [];
    if (state === 'idle') anims.push(breathe(2400));
    if (state === 'listening') {
      anims.push(breathe(700));
      anims.push(
        Animated.loop(
          Animated.timing(halo, {
            toValue: 1,
            duration: 1600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          })
        )
      );
    }
    if (state === 'processing') anims.push(breathe(420));
    if (state === 'responding') anims.push(breathe(1500));

    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [state, pulse, halo]);

  const scaleRange = {
    idle: [1, 1.035],
    listening: [1, 1.08],
    processing: [0.98, 1.04],
    responding: [1, 1.04],
  }[state];

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: scaleRange });
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.25, 0] });

  return (
    <View style={[styles.wrap, { width: size * 1.6, height: size * 1.6 }]}>
      {/* Ambient glow — always on, whisper quiet */}
      <View
        style={[
          styles.glow,
          {
            width: size * 1.45,
            height: size * 1.45,
            borderRadius: size,
            backgroundColor: theme.colors.aiA,
            opacity: theme.dark ? 0.1 : 0.08,
          },
        ]}
      />
      {state === 'listening' ? (
        <Animated.View
          style={[
            styles.glow,
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
      ) : null}
      <Animated.View style={{ width: size, height: size, transform: [{ scale }] }}>
        <LinearGradient
          colors={[theme.colors.aiA, theme.colors.aiB]}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.85, y: 1 }}
          style={[styles.orb, { borderRadius: size / 2 }]}
        >
          {/* Soft top light, instead of a hard specular dot */}
          <LinearGradient
            colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.75 }}
            style={StyleSheet.absoluteFill}
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  orb: { flex: 1, overflow: 'hidden' },
});
