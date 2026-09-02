import React, { useMemo } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { FLOW_PATH, FLOW_PATH_LENGTH, RAYS, SUN, brand } from '../../theme/brand';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

interface DayFlowMarkProps {
  size?: number;
  /** Use the deeper gradient meant for light surfaces. */
  light?: boolean;
  /** Draw a soft glow under the stroke (dark surfaces only). */
  glow?: boolean;
  /**
   * 0..1 draw progress. At 0 the stroke is invisible; at 1 it's complete and
   * the sun is fully visible. Omit for a static mark.
   */
  progress?: Animated.Value;
  /** Render only the flow stroke, in a single colour (e.g. tab icons). */
  monochrome?: string;
}

let gradientSeq = 0;

export function DayFlowMark({
  size = 96,
  light = false,
  glow = !light,
  progress,
  monochrome,
}: DayFlowMarkProps) {
  // Unique gradient ids so several marks can coexist on one screen.
  const ids = useMemo(() => {
    const n = ++gradientSeq;
    return { flow: `dfFlow${n}`, sun: `dfSun${n}` };
  }, []);
  const colors = light ? brand.flowLight : brand.flowDark;

  const dashOffset = progress
    ? progress.interpolate({ inputRange: [0, 1], outputRange: [FLOW_PATH_LENGTH, 0] })
    : undefined;
  const sunOpacity = progress
    ? progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0, 0, 1] })
    : 1;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={ids.flow} gradientUnits="userSpaceOnUse" x1="13" y1="54" x2="87" y2="30">
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="0.55" stopColor={colors[1]} />
          <Stop offset="1" stopColor={colors[2]} />
        </LinearGradient>
        <LinearGradient id={ids.sun} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={brand.sunTop} />
          <Stop offset="1" stopColor={brand.sunBottom} />
        </LinearGradient>
      </Defs>

      {glow && !monochrome ? (
        <Path
          d={FLOW_PATH}
          fill="none"
          stroke={colors[1]}
          strokeOpacity={0.22}
          strokeWidth={19}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      <AnimatedPath
        d={FLOW_PATH}
        fill="none"
        stroke={monochrome ?? `url(#${ids.flow})`}
        strokeWidth={11.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={progress ? [FLOW_PATH_LENGTH, FLOW_PATH_LENGTH] : undefined}
        strokeDashoffset={dashOffset}
      />

      <AnimatedG opacity={sunOpacity}>
        {glow && !monochrome ? (
          <Circle cx={SUN.cx} cy={SUN.cy} r={SUN.r * 1.9} fill={brand.sunBottom} fillOpacity={0.18} />
        ) : null}
        <Circle cx={SUN.cx} cy={SUN.cy} r={SUN.r} fill={monochrome ?? `url(#${ids.sun})`} />
        {RAYS.map(([x1, y1, x2, y2], i) => (
          <Line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={monochrome ?? brand.ray}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
      </AnimatedG>
    </Svg>
  );
}
