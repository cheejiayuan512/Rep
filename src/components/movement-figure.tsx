/**
 * A side or front view of the lift. The head stays a separate circle, larger
 * than the stroke, so the pose still reads as a person at list size.
 * The lime mark is the bar, cable, or dumbbell.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { MovementPose } from '../domain/movement-pose';
import { colors } from '../theme/colors';

interface MovementFigureProps {
  pose: MovementPose;
  size?: number;
}

const body = {
  fill: 'none' as const,
  stroke: colors.text,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2.6,
};

const limb = {
  fill: 'none' as const,
  stroke: colors.text,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2.3,
};

const bar = {
  fill: 'none' as const,
  stroke: colors.accent,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2.6,
};

const stage = {
  fill: 'none' as const,
  stroke: colors.faint,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2,
};

export const MovementFigure: React.FC<MovementFigureProps> = React.memo(function MovementFigure({ pose, size = 44 }) {
  const art = size - 6;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.frame, { borderRadius: size > 48 ? 16 : 10, height: size, width: size }]}>
      <Svg fill="none" height={art} viewBox="0 0 64 64" width={art}>
        {draw(pose)}
      </Svg>
    </View>
  );
});

function head(cx: number, cy: number): React.ReactNode {
  return <Circle cx={cx} cy={cy} fill={colors.text} r={4.2} />;
}

function plates(x1: number, x2: number, y: number): React.ReactNode {
  return <Path d={`M${x1} ${y - 5} V${y + 5} M${x2} ${y - 5} V${y + 5}`} {...bar} />;
}

function draw(pose: MovementPose): React.ReactNode {
  switch (pose) {
    case 'squat':
      return (
        <>
          {head(40, 14)}
          <Path d="M39 18.5 V32" {...body} />
          <Path d="M39 32 L24 40 L28 54" {...limb} />
          <Path d="M39 32 L50 42 L47 54" {...limb} />
          <Path d="M26 22 H52" {...bar} />
          {plates(26, 52, 22)}
        </>
      );
    case 'bench':
      return (
        <>
          <Path d="M6 44 H58" {...stage} />
          {head(16, 36)}
          <Path d="M22 38 H44" {...body} />
          <Path d="M32 38 V20" {...limb} />
          <Path d="M20 18 H44" {...bar} />
          {plates(20, 44, 18)}
          <Path d="M44 38 L54 50 L46 56" {...limb} />
        </>
      );
    case 'deadlift':
      return (
        <>
          {head(46, 18)}
          <Path d="M43 22 L26 36" {...body} />
          <Path d="M34 28 L18 46" {...limb} />
          <Path d="M8 48 H32" {...bar} />
          {plates(8, 32, 48)}
          <Path d="M26 36 L30 56" {...limb} />
          <Path d="M26 36 L42 56" {...limb} />
        </>
      );
    case 'row':
      return (
        <>
          {head(48, 18)}
          <Path d="M45 22 L26 34" {...body} />
          <Path d="M36 27 L24 38 L38 40" {...limb} />
          <Path d="M16 42 H46" {...bar} />
          <Path d="M26 34 L30 56" {...limb} />
          <Path d="M26 34 L40 56" {...limb} />
        </>
      );
    case 'press':
      return (
        <>
          {head(32, 26)}
          <Path d="M32 31 V44" {...body} />
          <Path d="M32 44 L24 58" {...limb} />
          <Path d="M32 44 L40 58" {...limb} />
          <Path d="M24 34 L18 14" {...limb} />
          <Path d="M40 34 L46 14" {...limb} />
          <Path d="M12 12 H52" {...bar} />
          {plates(12, 52, 12)}
        </>
      );
    case 'curl':
      return (
        <>
          {head(26, 12)}
          <Path d="M26 17 V38" {...body} />
          <Path d="M26 38 L18 56" {...limb} />
          <Path d="M26 38 L34 56" {...limb} />
          <Path d="M22 22 V34" {...limb} />
          <Path d="M22 34 L38 22" {...limb} />
          <Path d="M34 18 H50" {...bar} />
        </>
      );
    case 'pulldown':
      return (
        <>
          <Path d="M32 4 V12" {...bar} />
          <Path d="M14 14 H50" {...bar} />
          <Path d="M18 16 L28 28" {...limb} />
          <Path d="M46 16 L36 28" {...limb} />
          {head(32, 30)}
          <Path d="M32 35 V46" {...body} />
          <Path d="M18 50 H46" {...stage} />
          <Path d="M32 46 L46 50" {...limb} />
        </>
      );
    case 'pullup':
      return (
        <>
          <Path d="M8 8 H56" {...bar} />
          {plates(8, 56, 8)}
          <Path d="M18 10 L28 24" {...limb} />
          <Path d="M46 10 L36 24" {...limb} />
          {head(32, 28)}
          <Path d="M32 33 V46" {...body} />
          <Path d="M32 46 L22 54 L26 60" {...limb} />
          <Path d="M32 46 L42 56" {...limb} />
        </>
      );
    case 'lunge':
      return (
        <>
          {head(28, 10)}
          <Path d="M28 15 V32" {...body} />
          <Path d="M28 32 L44 42 L40 56" {...limb} />
          <Path d="M28 32 L14 44 L10 56" {...limb} />
        </>
      );
    case 'thrust':
      return (
        <>
          <Path d="M6 28 H24 V46 H6 Z" {...stage} />
          {head(50, 24)}
          <Path d="M22 30 H44" {...body} />
          <Path d="M36 30 L30 48 H42" {...limb} />
          <Path d="M30 26 H52" {...bar} />
          {plates(30, 52, 26)}
        </>
      );
    case 'calf':
      return (
        <>
          {head(32, 10)}
          <Path d="M32 15 V44" {...body} />
          <Path d="M32 44 L24 40" {...limb} />
          <Path d="M32 44 V50" {...limb} />
          <Path d="M18 52 H46 V58 H18 Z" {...stage} />
        </>
      );
    case 'crunch':
      return (
        <>
          <Path d="M6 50 H58" {...stage} />
          <Path d="M36 48 L48 34 L32 30" {...limb} />
          <Path d="M34 36 L18 26" {...body} />
          {head(14, 24)}
        </>
      );
    case 'fly':
      return (
        <>
          <Path d="M8 46 H56" {...stage} />
          {head(16, 36)}
          <Path d="M22 38 H42" {...body} />
          <Path d="M30 38 L16 22" {...limb} />
          <Path d="M32 38 L50 24" {...limb} />
          <Circle cx="14" cy="20" fill="none" r="3.2" stroke={colors.accent} strokeWidth={2.4} />
          <Circle cx="52" cy="22" fill="none" r="3.2" stroke={colors.accent} strokeWidth={2.4} />
        </>
      );
    case 'lateral':
      return (
        <>
          {head(32, 12)}
          <Path d="M32 17 V40" {...body} />
          <Path d="M32 40 L24 56" {...limb} />
          <Path d="M32 40 L40 56" {...limb} />
          <Path d="M32 24 L12 30" {...limb} />
          <Path d="M32 24 L52 30" {...limb} />
          <Circle cx="10" cy="31" fill="none" r="3" stroke={colors.accent} strokeWidth={2.4} />
          <Circle cx="54" cy="31" fill="none" r="3" stroke={colors.accent} strokeWidth={2.4} />
        </>
      );
    case 'shrug':
      return (
        <>
          {head(32, 14)}
          <Path d="M20 24 H44" {...body} />
          <Path d="M24 24 V36" {...limb} />
          <Path d="M40 24 V36" {...limb} />
          <Path d="M14 38 H50" {...bar} />
          {plates(14, 50, 38)}
          <Path d="M32 28 V42" {...body} />
          <Path d="M32 42 L24 56" {...limb} />
          <Path d="M32 42 L40 56" {...limb} />
        </>
      );
    case 'legcurl':
      return (
        <>
          <Path d="M6 36 H46 V46 H6 Z" {...stage} />
          {head(14, 28)}
          <Path d="M18 32 H40" {...body} />
          <Path d="M40 32 C50 32 54 20 46 16" {...limb} />
        </>
      );
    case 'pushdown':
      return (
        <>
          <Path d="M40 4 V18" {...bar} />
          <Path d="M28 20 H52" {...bar} />
          {head(24, 16)}
          <Path d="M24 21 V40" {...body} />
          <Path d="M28 24 V34" {...limb} />
          <Path d="M28 34 L40 42" {...limb} />
          <Path d="M24 40 L16 56" {...limb} />
          <Path d="M24 40 L32 56" {...limb} />
        </>
      );
    case 'pushup':
      return (
        <>
          <Path d="M6 50 H58" {...stage} />
          {head(14, 28)}
          <Path d="M18 30 L50 44" {...body} />
          <Path d="M28 34 L30 50" {...limb} />
          <Path d="M50 44 V50" {...limb} />
        </>
      );
    case 'dip':
      return (
        <>
          <Path d="M12 8 V56" {...bar} />
          <Path d="M52 8 V56" {...bar} />
          {head(32, 16)}
          <Path d="M32 21 V38" {...body} />
          <Path d="M32 26 L16 36" {...limb} />
          <Path d="M32 26 L48 36" {...limb} />
          <Path d="M32 38 L24 50 L28 56" {...limb} />
        </>
      );
    case 'legpress':
      return (
        <>
          <Path d="M6 30 H28 V54 H6 Z" {...stage} />
          {head(16, 24)}
          <Path d="M24 34 L40 20 L52 28" {...limb} />
          <Path d="M36 14 H56" {...bar} />
          {plates(36, 56, 14)}
        </>
      );
    case 'legextension':
      return (
        <>
          <Path d="M6 34 H30 V54 H6 Z" {...stage} />
          {head(16, 28)}
          <Path d="M26 36 H50" {...limb} />
          <Path d="M46 30 H58" {...bar} />
        </>
      );
    case 'plank':
      return (
        <>
          <Path d="M6 48 H58" {...stage} />
          {head(14, 32)}
          <Path d="M18 34 H50" {...body} />
          <Path d="M26 34 V48" {...limb} />
          <Path d="M50 34 V48" {...limb} />
        </>
      );
    case 'legraise':
      return (
        <>
          <Path d="M12 8 H52" {...bar} />
          <Path d="M20 10 V22" {...limb} />
          <Path d="M44 10 V22" {...limb} />
          {head(32, 26)}
          <Path d="M32 31 V42" {...body} />
          <Path d="M32 42 L50 30" {...limb} />
        </>
      );
    case 'twist':
      return (
        <>
          {head(26, 14)}
          <Path d="M26 19 V40" {...body} />
          <Path d="M26 40 L18 56" {...limb} />
          <Path d="M26 40 L36 56" {...limb} />
          <Path d="M26 26 L44 34" {...limb} />
          <Circle cx="48" cy="36" fill="none" r="4" stroke={colors.accent} strokeWidth={2.4} />
        </>
      );
    case 'swing':
      return (
        <>
          {head(46, 16)}
          <Path d="M43 21 L28 36" {...body} />
          <Path d="M34 28 L30 46" {...limb} />
          <Path d="M28 36 L32 56" {...limb} />
          <Path d="M28 36 L42 56" {...limb} />
          <Circle cx="26" cy="48" fill="none" r="4.5" stroke={colors.accent} strokeWidth={2.4} />
        </>
      );
    case 'carry':
      return (
        <>
          {head(32, 12)}
          <Path d="M32 17 V40" {...body} />
          <Path d="M32 40 L24 56" {...limb} />
          <Path d="M32 40 L40 56" {...limb} />
          <Path d="M32 24 L20 36" {...limb} />
          <Path d="M32 24 L44 36" {...limb} />
          <Path d="M14 34 H22 V46 H14 Z" {...bar} />
          <Path d="M42 34 H50 V46 H42 Z" {...bar} />
        </>
      );
    case 'clean':
      return (
        <>
          {head(32, 14)}
          <Path d="M32 19 V40" {...body} />
          <Path d="M32 40 L24 56" {...limb} />
          <Path d="M32 40 L40 56" {...limb} />
          <Path d="M18 30 H46" {...bar} />
          {plates(18, 46, 30)}
          <Path d="M22 30 L16 22" {...limb} />
          <Path d="M42 30 L48 22" {...limb} />
        </>
      );
    case 'jump':
      return (
        <>
          <Path d="M36 40 H58 V58 H36 Z" {...stage} />
          {head(22, 12)}
          <Path d="M22 17 V26" {...body} />
          <Path d="M22 26 L12 34 L16 40" {...limb} />
          <Path d="M22 26 L32 34 L28 40" {...limb} />
        </>
      );
    case 'kick':
      return (
        <>
          <Path d="M6 50 H28" {...stage} />
          {head(14, 30)}
          <Path d="M18 34 H36" {...body} />
          <Path d="M24 34 V50" {...limb} />
          <Path d="M36 32 L54 20" {...limb} />
          <Path d="M36 36 V50" {...limb} />
        </>
      );
    case 'abduct':
      return (
        <>
          <Path d="M8 38 H32 V56 H8 Z" {...stage} />
          {head(18, 22)}
          <Path d="M20 27 V38" {...body} />
          <Path d="M20 36 L10 46" {...limb} />
          <Path d="M24 36 L44 30" {...limb} />
          <Path d="M40 26 H54" {...bar} />
        </>
      );
    case 'rollout':
      return (
        <>
          <Path d="M6 50 H26" {...stage} />
          {head(18, 36)}
          <Path d="M22 40 L44 32" {...body} />
          <Circle cx="50" cy="30" fill="none" r="5" stroke={colors.accent} strokeWidth={2.4} />
          <Path d="M50 25 V35" {...bar} />
        </>
      );
    case 'facepull':
      return (
        <>
          {head(24, 22)}
          <Path d="M24 27 V44" {...body} />
          <Path d="M24 44 L16 58" {...limb} />
          <Path d="M24 44 L34 58" {...limb} />
          <Path d="M28 30 L48 24" {...limb} />
          <Path d="M28 34 L48 40" {...limb} />
          <Path d="M48 22 V42" {...bar} />
        </>
      );
    case 'pullover':
      return (
        <>
          <Path d="M10 46 H54" {...stage} />
          {head(44, 34)}
          <Path d="M38 36 H22" {...body} />
          <Path d="M26 36 L12 20" {...limb} />
          <Circle cx="10" cy="17" fill="none" r="3.4" stroke={colors.accent} strokeWidth={2.4} />
        </>
      );
    case 'upright':
      return (
        <>
          {head(32, 12)}
          <Path d="M32 17 V40" {...body} />
          <Path d="M32 40 L24 56" {...limb} />
          <Path d="M32 40 L40 56" {...limb} />
          <Path d="M22 16 L32 30" {...limb} />
          <Path d="M42 16 L32 30" {...limb} />
          <Path d="M16 32 H48" {...bar} />
        </>
      );
    case 'frontraise':
      return (
        <>
          {head(26, 14)}
          <Path d="M26 19 V40" {...body} />
          <Path d="M26 40 L18 56" {...limb} />
          <Path d="M26 40 L34 56" {...limb} />
          <Path d="M26 26 L46 16" {...limb} />
          <Circle cx="50" cy="14" fill="none" r="3.2" stroke={colors.accent} strokeWidth={2.4} />
        </>
      );
    case 'reardelt':
      return (
        <>
          {head(48, 20)}
          <Path d="M44 25 L26 36" {...body} />
          <Path d="M34 30 L16 22" {...limb} />
          <Path d="M34 32 L16 42" {...limb} />
          <Circle cx="14" cy="20" fill="none" r="2.8" stroke={colors.accent} strokeWidth={2.2} />
          <Circle cx="14" cy="44" fill="none" r="2.8" stroke={colors.accent} strokeWidth={2.2} />
          <Path d="M26 36 L30 56" {...limb} />
          <Path d="M26 36 L40 56" {...limb} />
        </>
      );
    case 'skull':
      return (
        <>
          <Path d="M6 46 H58" {...stage} />
          {head(16, 36)}
          <Path d="M22 38 H44" {...body} />
          <Path d="M32 38 V22" {...limb} />
          <Path d="M32 22 L20 28" {...limb} />
          <Path d="M14 26 H32" {...bar} />
        </>
      );
    case 'overhead':
      return (
        <>
          {head(28, 22)}
          <Path d="M28 27 V42" {...body} />
          <Path d="M28 42 L20 56" {...limb} />
          <Path d="M28 42 L36 56" {...limb} />
          <Path d="M30 30 V12" {...limb} />
          <Path d="M30 12 L42 20" {...limb} />
          <Circle cx="46" cy="22" fill="none" r="3.4" stroke={colors.accent} strokeWidth={2.4} />
        </>
      );
    case 'backext':
      return (
        <>
          <Path d="M16 36 H48 V48 H16 Z" {...stage} />
          {head(12, 26)}
          <Path d="M16 30 L40 36" {...body} />
          <Path d="M42 40 L54 54" {...limb} />
        </>
      );
    case 'deadbug':
      return (
        <>
          <Path d="M6 48 H58" {...stage} />
          {head(14, 36)}
          <Path d="M18 38 H42" {...body} />
          <Path d="M26 36 L18 22" {...limb} />
          <Path d="M36 40 L50 26" {...limb} />
        </>
      );
    case 'generic':
      return (
        <>
          {head(32, 12)}
          <Path d="M32 17 V40" {...body} />
          <Path d="M32 40 L24 56" {...limb} />
          <Path d="M32 40 L40 56" {...limb} />
          <Path d="M32 26 L20 36" {...limb} />
          <Path d="M32 26 L44 36" {...limb} />
          <Path d="M14 38 H50" {...bar} />
        </>
      );
    default: {
      const forgotten: never = pose;
      return forgotten;
    }
  }
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
  },
});
