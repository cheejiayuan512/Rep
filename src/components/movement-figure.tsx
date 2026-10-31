/**
 * A small pose for one movement, drawn in the same stroke style as the badges.
 * The lime mark is the bar, cable, or dumbbell. The figure is decorative.
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

const limb = {
  fill: 'none' as const,
  stroke: colors.text,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.7,
};

const gear = {
  fill: 'none' as const,
  stroke: colors.accent,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.9,
};

export const MovementFigure: React.FC<MovementFigureProps> = React.memo(function MovementFigure({ pose, size = 40 }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.frame, { borderRadius: size > 48 ? 16 : 10, height: size, width: size }]}>
      <Svg fill="none" height={size * 0.72} viewBox="0 0 32 32" width={size * 0.72}>
        {draw(pose)}
      </Svg>
    </View>
  );
});

function head(cx: number, cy: number): React.ReactNode {
  return <Circle cx={cx} cy={cy} fill={colors.text} r={2.15} />;
}

function draw(pose: MovementPose): React.ReactNode {
  switch (pose) {
    case 'squat':
      return (
        <>
          {head(18, 7.5)}
          <Path d="M18 9.6 L15.2 15.2" {...limb} />
          <Path d="M15.2 15.2 L9 18.2 L12.2 27" {...limb} />
          <Path d="M15.2 15.2 L21.2 19.5 L19.2 27" {...limb} />
          <Path d="M10.2 27 H15 M17.2 27 H23" {...limb} />
          <Path d="M9.5 8.6 H25" {...gear} />
          <Path d="M9.5 6.8 V10.4 M25 6.8 V10.4" {...gear} />
        </>
      );
    case 'bench':
      return (
        <>
          <Path d="M4 21.5 H28" {...limb} />
          {head(8, 16.5)}
          <Path d="M10.2 17 H22" {...limb} />
          <Path d="M22 17 L28 19.5" {...limb} />
          <Path d="M15 16.6 V9.2" {...limb} />
          <Path d="M9 8.4 H21" {...gear} />
          <Path d="M9 6.8 V10 M21 6.8 V10" {...gear} />
        </>
      );
    case 'deadlift':
      return (
        <>
          {head(21, 10)}
          <Path d="M20.2 12.2 L13.5 18.2" {...limb} />
          <Path d="M16.5 14.6 L11.5 24.5" {...limb} />
          <Path d="M13.5 18.2 L16.5 28.5" {...limb} />
          <Path d="M13.5 18.2 L22 28.5" {...limb} />
          <Path d="M6 25 H20" {...gear} />
          <Path d="M6 23.2 V26.8 M20 23.2 V26.8" {...gear} />
        </>
      );
    case 'row':
      return (
        <>
          {head(22, 11)}
          <Path d="M21 13.2 L12.5 17.5" {...limb} />
          <Path d="M16.5 14.8 L12.2 19 L18.5 20.2" {...limb} />
          <Path d="M12.5 17.5 L15 28" {...limb} />
          <Path d="M12.5 17.5 L21 28" {...limb} />
          <Path d="M11 20.6 H23" {...gear} />
        </>
      );
    case 'press':
      return (
        <>
          {head(16, 13)}
          <Path d="M11 7 L15 14.5" {...limb} />
          <Path d="M21 7 L17 14.5" {...limb} />
          <Path d="M16 15.5 V22" {...limb} />
          <Path d="M16 22 L12 30" {...limb} />
          <Path d="M16 22 L20 30" {...limb} />
          <Path d="M8 5.5 H24" {...gear} />
          <Path d="M8 3.8 V7.2 M24 3.8 V7.2" {...gear} />
        </>
      );
    case 'curl':
      return (
        <>
          {head(15, 6.5)}
          <Path d="M15 8.6 V17" {...limb} />
          <Path d="M15 17 L11.5 29" {...limb} />
          <Path d="M15 17 L19 29" {...limb} />
          <Path d="M13.2 11 V17.5" {...limb} />
          <Path d="M13.2 17.5 L20 12.5" {...limb} />
          <Path d="M18.2 11.2 H25" {...gear} />
        </>
      );
    case 'pulldown':
      return (
        <>
          <Path d="M16 2 V6.5" {...gear} />
          <Path d="M8 7 H24" {...gear} />
          <Path d="M10 8 L14.2 14" {...limb} />
          <Path d="M22 8 L17.8 14" {...limb} />
          {head(16, 12.2)}
          <Path d="M16 14.4 V21" {...limb} />
          <Path d="M10 22.5 H22" {...limb} />
          <Path d="M16 21 L24 22.5" {...limb} />
        </>
      );
    case 'pullup':
      return (
        <>
          <Path d="M6 4.5 H26" {...gear} />
          <Path d="M10 5.2 L14 12" {...limb} />
          <Path d="M22 5.2 L18 12" {...limb} />
          {head(16, 11.5)}
          <Path d="M16 13.6 V20" {...limb} />
          <Path d="M16 20 L11 24 L13.5 28.5" {...limb} />
          <Path d="M16 20 L20 25" {...limb} />
        </>
      );
    case 'lunge':
      return (
        <>
          {head(14, 5.5)}
          <Path d="M14 7.6 V15" {...limb} />
          <Path d="M14 15 L22 19.5 L20 28.5" {...limb} />
          <Path d="M14 15 L7 21 L5.5 29" {...limb} />
          <Path d="M17.5 28.5 H23.5 M3.5 29 H8" {...limb} />
          <Path d="M11.5 16.5 H17" {...gear} />
        </>
      );
    case 'thrust':
      return (
        <>
          <Path d="M4 16 H14 V23 H4 Z" {...limb} />
          {head(25.5, 13)}
          <Path d="M13 15.5 H23" {...limb} />
          <Path d="M19 15.5 L16.5 24 H22" {...limb} />
          <Path d="M15 13.2 H26" {...gear} />
          <Path d="M15 11.6 V14.8 M26 11.6 V14.8" {...gear} />
        </>
      );
    case 'calf':
      return (
        <>
          {head(16, 5.5)}
          <Path d="M16 7.6 V23" {...limb} />
          <Path d="M16 23 L12.5 20.5" {...limb} />
          <Path d="M16 23 L16 26.5" {...limb} />
          <Path d="M10 27 H22 V30.5 H10 Z" {...limb} />
        </>
      );
    case 'crunch':
      return (
        <>
          <Path d="M4 26.5 H28" {...limb} />
          <Path d="M18 26 L23 17.5 L15 16" {...limb} />
          <Path d="M16 19.5 L9 15" {...limb} />
          {head(7.2, 14.2)}
        </>
      );
    case 'fly':
      return (
        <>
          <Path d="M5 21 H28" {...limb} />
          {head(8, 16)}
          <Path d="M10 16.6 H21" {...limb} />
          <Path d="M14 16 L7 10" {...limb} />
          <Path d="M14 16 L23 11" {...limb} />
          <Circle cx="6.2" cy="9.2" r="1.7" {...gear} />
          <Circle cx="24" cy="10.2" r="1.7" {...gear} />
        </>
      );
    case 'lateral':
      return (
        <>
          {head(16, 6.5)}
          <Path d="M16 8.6 V17.5" {...limb} />
          <Path d="M16 17.5 L12 28" {...limb} />
          <Path d="M16 17.5 L20 28" {...limb} />
          <Path d="M16 11.5 L5.5 14" {...limb} />
          <Path d="M16 11.5 L26.5 14" {...limb} />
          <Circle cx="4.6" cy="14.2" r="1.6" {...gear} />
          <Circle cx="27.4" cy="14.2" r="1.6" {...gear} />
        </>
      );
    case 'shrug':
      return (
        <>
          {head(16, 5.2)}
          <Path d="M12 9.5 V16" {...limb} />
          <Path d="M20 9.5 V16" {...limb} />
          <Path d="M16 10.5 V18" {...limb} />
          <Path d="M16 18 L12 28" {...limb} />
          <Path d="M16 18 L20 28" {...limb} />
          <Path d="M7 16.5 H25" {...gear} />
          <Path d="M7 14.8 V18.2 M25 14.8 V18.2" {...gear} />
        </>
      );
    case 'legcurl':
      return (
        <>
          <Path d="M3 18 H24 V22 H3 Z" {...limb} />
          {head(6.5, 14.2)}
          <Path d="M8.5 15 H20" {...limb} />
          <Path d="M20 15 C24 15 26.5 11 24.5 8.5" {...limb} />
        </>
      );
    case 'pushdown':
      return (
        <>
          <Path d="M22 2 V8" {...gear} />
          {head(13, 8)}
          <Path d="M13.5 10 V18" {...limb} />
          <Path d="M13.5 18 L10 28" {...limb} />
          <Path d="M13.5 18 L17.5 28" {...limb} />
          <Path d="M15.5 11 V15" {...limb} />
          <Path d="M15.5 15 L21.5 18" {...limb} />
          <Path d="M18 18.4 H26" {...gear} />
        </>
      );
    case 'pushup':
      return (
        <>
          <Path d="M3 24 H30" {...limb} />
          {head(6, 12)}
          <Path d="M8 13.2 L25 20" {...limb} />
          <Path d="M12 15 L13.5 23" {...limb} />
          <Path d="M25 20 V24" {...limb} />
        </>
      );
    case 'dip':
      return (
        <>
          <Path d="M7 5 V28" {...gear} />
          <Path d="M25 5 V28" {...gear} />
          {head(16, 8)}
          <Path d="M16 10 V18" {...limb} />
          <Path d="M16 12 L9 16" {...limb} />
          <Path d="M16 12 L23 16" {...limb} />
          <Path d="M16 18 L12 24 L14 28" {...limb} />
        </>
      );
    case 'legpress':
      return (
        <>
          <Path d="M4 16 H15 V27 H4 Z" {...limb} />
          {head(8, 14)}
          <Path d="M12 17 L21 11 L27 15" {...limb} />
          <Path d="M20 8 H29" {...gear} />
          <Path d="M20 6.4 V9.6 M29 6.4 V9.6" {...gear} />
        </>
      );
    case 'legextension':
      return (
        <>
          <Path d="M4 18 H16 V28 H4 Z" {...limb} />
          {head(8, 15)}
          <Path d="M14 18 H27" {...limb} />
          <Path d="M25 15.5 H30" {...gear} />
        </>
      );
    case 'plank':
      return (
        <>
          <Path d="M4 24 H28" {...limb} />
          {head(6.5, 15)}
          <Path d="M8.5 16 H25" {...limb} />
          <Path d="M12 16 V23" {...limb} />
          <Path d="M25 16 V24" {...limb} />
        </>
      );
    case 'legraise':
      return (
        <>
          <Path d="M7 4 H25" {...gear} />
          <Path d="M12 4.6 V10" {...limb} />
          <Path d="M20 4.6 V10" {...limb} />
          {head(16, 11.5)}
          <Path d="M16 13.6 V19" {...limb} />
          <Path d="M16 19 L25 14" {...limb} />
        </>
      );
    case 'twist':
      return (
        <>
          {head(12, 8)}
          <Path d="M12.5 10 V18" {...limb} />
          <Path d="M12.5 18 L8 26" {...limb} />
          <Path d="M12.5 18 L18 26" {...limb} />
          <Path d="M12.5 13 L22 16" {...limb} />
          <Circle cx="23.5" cy="16.5" r="2.3" {...gear} />
        </>
      );
    case 'swing':
      return (
        <>
          {head(20, 8)}
          <Path d="M19 10.2 L13 17" {...limb} />
          <Path d="M15.5 13.5 L14 22" {...limb} />
          <Path d="M13 17 L16 28" {...limb} />
          <Path d="M13 17 L21 28" {...limb} />
          <Circle cx="13.5" cy="23.5" r="2.4" {...gear} />
        </>
      );
    case 'carry':
      return (
        <>
          {head(16, 6)}
          <Path d="M16 8.2 V17" {...limb} />
          <Path d="M16 17 L12 28" {...limb} />
          <Path d="M16 17 L20 28" {...limb} />
          <Path d="M16 11 L10 17" {...limb} />
          <Path d="M16 11 L22 17" {...limb} />
          <Path d="M7.5 16 H12.5 V22 H7.5 Z" {...gear} />
          <Path d="M19.5 16 H24.5 V22 H19.5 Z" {...gear} />
        </>
      );
    case 'clean':
      return (
        <>
          {head(16, 6.5)}
          <Path d="M16 8.6 V17.5" {...limb} />
          <Path d="M16 17.5 L12 28" {...limb} />
          <Path d="M16 17.5 L20 28" {...limb} />
          <Path d="M12 13.5 H20" {...gear} />
          <Path d="M12 12 V15 M20 12 V15" {...gear} />
          <Path d="M13 13.5 L11 10" {...limb} />
          <Path d="M19 13.5 L21 10" {...limb} />
        </>
      );
    case 'jump':
      return (
        <>
          <Path d="M18 20 H30 V30 H18 Z" {...limb} />
          {head(10, 7)}
          <Path d="M10 9 V14" {...limb} />
          <Path d="M10 14 L6 18 L8 21" {...limb} />
          <Path d="M10 14 L15 17" {...limb} />
        </>
      );
    case 'kick':
      return (
        <>
          <Path d="M4 25 H16" {...limb} />
          {head(7, 16)}
          <Path d="M9 18 H18" {...limb} />
          <Path d="M11 18 V25" {...limb} />
          <Path d="M18 17 L27 12" {...limb} />
          <Path d="M18 18 V25" {...limb} />
        </>
      );
    case 'abduct':
      return (
        <>
          <Path d="M6 20 H18 V28 H6 Z" {...limb} />
          {head(10, 12)}
          <Path d="M12 16 L8 22" {...limb} />
          <Path d="M14 16 L24 14" {...limb} />
          <Path d="M22 12 H28" {...gear} />
          <Path d="M6 22 H2" {...gear} />
        </>
      );
    case 'rollout':
      return (
        <>
          <Path d="M4 26 H14" {...limb} />
          {head(10, 18)}
          <Path d="M12 20 L24 16" {...limb} />
          <Circle cx="26" cy="16" r="2.5" {...gear} />
          <Path d="M26 13.5 V18.5" {...gear} />
        </>
      );
    case 'facepull':
      return (
        <>
          <Path d="M28 12 H22" {...gear} />
          {head(12, 12)}
          <Path d="M14 14 V22" {...limb} />
          <Path d="M16 15 L22 12" {...limb} />
          <Path d="M16 15 L22 18" {...limb} />
          <Path d="M14 22 L11 29" {...limb} />
          <Path d="M14 22 L18 29" {...limb} />
        </>
      );
    case 'pullover':
      return (
        <>
          <Path d="M6 22 H26" {...limb} />
          {head(20, 16)}
          <Path d="M18 16.8 H10" {...limb} />
          <Path d="M12 16 L6 10" {...limb} />
          <Circle cx="5" cy="9" r="1.8" {...gear} />
        </>
      );
    case 'upright':
      return (
        <>
          {head(16, 6)}
          <Path d="M16 8.2 V17.5" {...limb} />
          <Path d="M16 17.5 L12 28" {...limb} />
          <Path d="M16 17.5 L20 28" {...limb} />
          <Path d="M11 8 L16 14" {...limb} />
          <Path d="M21 8 L16 14" {...limb} />
          <Path d="M9 14.5 H23" {...gear} />
        </>
      );
    case 'frontraise':
      return (
        <>
          {head(14, 6.5)}
          <Path d="M14 8.6 V17.5" {...limb} />
          <Path d="M14 17.5 L11 28" {...limb} />
          <Path d="M14 17.5 L18 28" {...limb} />
          <Path d="M14 12 L24 8" {...limb} />
          <Circle cx="25.2" cy="7.2" r="1.7" {...gear} />
        </>
      );
    case 'reardelt':
      return (
        <>
          {head(22, 10)}
          <Path d="M21 12.2 L13 16.5" {...limb} />
          <Path d="M16 14 L8 11" {...limb} />
          <Path d="M16 14.5 L9 19" {...limb} />
          <Path d="M13 16.5 L15.5 27" {...limb} />
          <Path d="M13 16.5 L20 27" {...limb} />
          <Circle cx="7" cy="10.2" r="1.5" {...gear} />
          <Circle cx="8" cy="19.6" r="1.5" {...gear} />
        </>
      );
    case 'skull':
      return (
        <>
          <Path d="M4 22 H28" {...limb} />
          {head(9, 16)}
          <Path d="M11 16.6 H22" {...limb} />
          <Path d="M16 16 V9" {...limb} />
          <Path d="M16 9 L10 11.5" {...limb} />
          <Path d="M8 10 H16" {...gear} />
        </>
      );
    case 'overhead':
      return (
        <>
          {head(16, 11)}
          <Path d="M16 13 V21" {...limb} />
          <Path d="M16 21 L12 29" {...limb} />
          <Path d="M16 21 L20 29" {...limb} />
          <Path d="M14 14 V7" {...limb} />
          <Path d="M14 7 L18 10" {...limb} />
          <Circle cx="19" cy="10.6" r="1.7" {...gear} />
        </>
      );
    case 'backext':
      return (
        <>
          <Path d="M8 18 H24 V23 H8 Z" {...limb} />
          {head(7, 12)}
          <Path d="M9 14 L18 17" {...limb} />
          <Path d="M20 18 L26 26" {...limb} />
        </>
      );
    case 'deadbug':
      return (
        <>
          <Path d="M4 24 H28" {...limb} />
          {head(8, 18)}
          <Path d="M10 19 H20" {...limb} />
          <Path d="M14 18 L10 11" {...limb} />
          <Path d="M18 19 L24 13" {...limb} />
        </>
      );
    case 'generic':
      return (
        <>
          {head(16, 6)}
          <Path d="M16 8.2 V17" {...limb} />
          <Path d="M16 17 L12 28" {...limb} />
          <Path d="M16 17 L20 28" {...limb} />
          <Path d="M16 12 L11 16" {...limb} />
          <Path d="M16 12 L21 16" {...limb} />
          <Path d="M8 16.5 H24" {...gear} />
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
