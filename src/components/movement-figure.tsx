/**
 * One small pose per movement. Every figure uses the same head, limb weight,
 * and lime bar, so the set reads as icons rather than sketches.
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
  strokeWidth: 3.4,
};

const limb = {
  fill: 'none' as const,
  stroke: colors.text,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 2.8,
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
  strokeWidth: 1.6,
};

export const MovementFigure: React.FC<MovementFigureProps> = React.memo(function MovementFigure({ pose, size = 40 }) {
  const art = size - 4;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.frame, { borderRadius: size > 48 ? 16 : 10, height: size, width: size }]}>
      <Svg fill="none" height={art} viewBox="0 0 24 24" width={art}>
        {draw(pose)}
      </Svg>
    </View>
  );
});

function head(cx: number, cy: number): React.ReactNode {
  return <Circle cx={cx} cy={cy} fill={colors.text} r={1.85} />;
}

function stand(extra: React.ReactNode): React.ReactNode {
  return (
    <>
      {head(12, 4.2)}
      <Path d="M12 5.9 V12.4" {...body} />
      <Path d="M12 12.4 L9.1 20.4" {...limb} />
      <Path d="M12 12.4 L14.9 20.4" {...limb} />
      {extra}
    </>
  );
}

function hinge(extra: React.ReactNode): React.ReactNode {
  return (
    <>
      {head(16.4, 6.4)}
      <Path d="M15.6 8 L10.2 12.6" {...body} />
      <Path d="M10.2 12.6 L12.4 20.6" {...limb} />
      <Path d="M10.2 12.6 L16.6 20.6" {...limb} />
      {extra}
    </>
  );
}

function lying(extra: React.ReactNode): React.ReactNode {
  return (
    <>
      <Path d="M3 17.2 H21" {...stage} />
      {head(5.8, 13.5)}
      <Path d="M7.5 13.7 H16" {...body} />
      <Path d="M16 13.7 L20.4 16.2" {...limb} />
      {extra}
    </>
  );
}

function draw(pose: MovementPose): React.ReactNode {
  switch (pose) {
    case 'squat':
      return (
        <>
          {head(14.2, 4.6)}
          <Path d="M14 6.2 L12.4 11.2" {...body} />
          <Path d="M12.4 11.2 L7 14 L9.2 20.6" {...limb} />
          <Path d="M12.4 11.2 L17.2 14.6 L15.4 20.6" {...limb} />
          <Path d="M8.2 6.6 H18.6" {...bar} />
        </>
      );
    case 'bench':
      return lying(
        <>
          <Path d="M11.6 13.4 V7.2" {...limb} />
          <Path d="M8 6.4 H15.4" {...bar} />
        </>,
      );
    case 'deadlift':
      return hinge(
        <>
          <Path d="M12.6 10.2 L8.2 16.8" {...limb} />
          <Path d="M4.4 17.2 H13.6" {...bar} />
        </>,
      );
    case 'row':
      return hinge(
        <>
          <Path d="M13 10.4 L9.6 13.6 L14.6 14.6" {...limb} />
          <Path d="M8.8 14.8 H17.2" {...bar} />
        </>,
      );
    case 'press':
      return (
        <>
          <Path d="M6.2 3.4 H17.8" {...bar} />
          <Path d="M8 4.4 L11 9.2" {...limb} />
          <Path d="M16 4.4 L13 9.2" {...limb} />
          {head(12, 10.6)}
          <Path d="M12 12.2 V16" {...body} />
          <Path d="M12 16 L9.2 21" {...limb} />
          <Path d="M12 16 L14.8 21" {...limb} />
        </>
      );
    case 'curl':
      return stand(
        <>
          <Path d="M10.6 8 V12.6" {...limb} />
          <Path d="M10.6 12.6 L16.2 9.2" {...limb} />
          <Path d="M15 8.4 H19.4" {...bar} />
        </>,
      );
    case 'pulldown':
      return (
        <>
          <Path d="M12 1.8 V4.6" {...bar} />
          <Path d="M6.4 5 H17.6" {...bar} />
          <Path d="M8 6 L11 10" {...limb} />
          <Path d="M16 6 L13 10" {...limb} />
          {head(12, 9.2)}
          <Path d="M12 10.8 V15.4" {...body} />
          <Path d="M7.5 16.6 H16.5" {...stage} />
          <Path d="M12 15.4 L17.2 16.6" {...limb} />
        </>
      );
    case 'pullup':
      return (
        <>
          <Path d="M4.5 3.2 H19.5" {...bar} />
          <Path d="M7.4 3.6 L10.2 8.4" {...limb} />
          <Path d="M16.6 3.6 L13.8 8.4" {...limb} />
          {head(12, 8.6)}
          <Path d="M12 10.2 V15" {...body} />
          <Path d="M12 15 L8.6 18.2 L10.2 21" {...limb} />
          <Path d="M12 15 L15.2 19" {...limb} />
        </>
      );
    case 'lunge':
      return (
        <>
          {head(11, 4)}
          <Path d="M11 5.6 V11.6" {...body} />
          <Path d="M11 11.6 L16.8 15.2 L15.2 21" {...limb} />
          <Path d="M11 11.6 L6.2 16.4 L4.8 21" {...limb} />
        </>
      );
    case 'thrust':
      return (
        <>
          <Path d="M3 12.5 H9.5 V18.5 H3 Z" {...stage} />
          {head(18.6, 10.2)}
          <Path d="M9.2 12.2 H16.8" {...body} />
          <Path d="M14.2 12.2 L12.4 18.6 H17" {...limb} />
          <Path d="M12.4 10.6 H19.6" {...bar} />
        </>
      );
    case 'calf':
      return (
        <>
          {head(12, 3.8)}
          <Path d="M12 5.4 V16.2" {...body} />
          <Path d="M12 16.2 L9.2 14.4" {...limb} />
          <Path d="M12 16.2 V18.4" {...limb} />
          <Path d="M7.5 19.2 H16.5 V21.4 H7.5 Z" {...stage} />
        </>
      );
    case 'crunch':
      return (
        <>
          <Path d="M3 19.6 H21" {...stage} />
          <Path d="M14.2 19.2 L17.6 13.6 L12.4 12.6" {...limb} />
          <Path d="M13 15.2 L8 11.6" {...body} />
          {head(6.6, 11)}
        </>
      );
    case 'fly':
      return lying(
        <>
          <Path d="M11.4 13.2 L6.4 8.6" {...limb} />
          <Path d="M12.2 13.2 L17.6 9.2" {...limb} />
          <Circle cx="5.6" cy="8" fill="none" r="1.35" stroke={colors.accent} strokeWidth={2} />
          <Circle cx="18.4" cy="8.6" fill="none" r="1.35" stroke={colors.accent} strokeWidth={2} />
        </>,
      );
    case 'lateral':
      return stand(
        <>
          <Path d="M12 8.2 L5.2 10.4" {...limb} />
          <Path d="M12 8.2 L18.8 10.4" {...limb} />
          <Circle cx="4.4" cy="10.6" fill="none" r="1.25" stroke={colors.accent} strokeWidth={2} />
          <Circle cx="19.6" cy="10.6" fill="none" r="1.25" stroke={colors.accent} strokeWidth={2} />
        </>,
      );
    case 'shrug':
      return (
        <>
          {head(12, 4.6)}
          <Path d="M8.4 8.2 H15.6" {...body} />
          <Path d="M9.2 8.2 V12.4" {...limb} />
          <Path d="M14.8 8.2 V12.4" {...limb} />
          <Path d="M6 12.6 H18" {...bar} />
          <Path d="M12 9.4 V14.2" {...body} />
          <Path d="M12 14.2 L9.2 21" {...limb} />
          <Path d="M12 14.2 L14.8 21" {...limb} />
        </>
      );
    case 'legcurl':
      return (
        <>
          <Path d="M3 14.2 H17.5 V17.6 H3 Z" {...stage} />
          {head(5.2, 11.6)}
          <Path d="M7 12.4 H15.2" {...body} />
          <Path d="M15.2 12.4 C18.4 12.4 19.6 8.6 17.8 7" {...limb} />
        </>
      );
    case 'pushdown':
      return (
        <>
          <Path d="M15.5 2 V7.2" {...bar} />
          <Path d="M12.2 7.6 H18.8" {...bar} />
          {head(9.2, 6.4)}
          <Path d="M9.4 8.4 V14.2" {...body} />
          <Path d="M10.6 9.6 V12.2" {...limb} />
          <Path d="M10.6 12.2 L15.2 14.6" {...limb} />
          <Path d="M9.4 14.2 L7.2 21" {...limb} />
          <Path d="M9.4 14.2 L12 21" {...limb} />
        </>
      );
    case 'pushup':
      return (
        <>
          <Path d="M3 18.6 H21" {...stage} />
          {head(5.2, 10.2)}
          <Path d="M7 11.2 L18.4 16.2" {...body} />
          <Path d="M10.2 12.6 L11.2 18.2" {...limb} />
          <Path d="M18.4 16.2 V18.6" {...limb} />
        </>
      );
    case 'dip':
      return (
        <>
          <Path d="M5.5 3.5 V20.5" {...bar} />
          <Path d="M18.5 3.5 V20.5" {...bar} />
          {head(12, 6.2)}
          <Path d="M12 7.8 V13.2" {...body} />
          <Path d="M12 9.2 L7.2 12.4" {...limb} />
          <Path d="M12 9.2 L16.8 12.4" {...limb} />
          <Path d="M12 13.2 L9.2 17.4 L10.6 20.4" {...limb} />
        </>
      );
    case 'legpress':
      return (
        <>
          <Path d="M3 12.5 H11 V20.5 H3 Z" {...stage} />
          {head(6.2, 11)}
          <Path d="M9.5 13.4 L15.6 8.8 L20 12" {...limb} />
          <Path d="M14.6 6.8 H21.2" {...bar} />
        </>
      );
    case 'legextension':
      return (
        <>
          <Path d="M3 14 H12 V21 H3 Z" {...stage} />
          {head(6.4, 12)}
          <Path d="M10.5 14.2 H19.2" {...limb} />
          <Path d="M17.6 12.4 H21.4" {...bar} />
        </>
      );
    case 'plank':
      return (
        <>
          <Path d="M3 18.4 H21" {...stage} />
          {head(5.4, 12.6)}
          <Path d="M7.2 13.2 H18.4" {...body} />
          <Path d="M10 13.2 V18" {...limb} />
          <Path d="M18.4 13.2 V18.4" {...limb} />
        </>
      );
    case 'legraise':
      return (
        <>
          <Path d="M5.5 3.2 H18.5" {...bar} />
          <Path d="M8.2 3.6 V7.4" {...limb} />
          <Path d="M15.8 3.6 V7.4" {...limb} />
          {head(12, 8.4)}
          <Path d="M12 10 V14.2" {...body} />
          <Path d="M12 14.2 L18.6 10.6" {...limb} />
        </>
      );
    case 'twist':
      return stand(
        <>
          <Path d="M12 8.4 L17.6 11" {...limb} />
          <Circle cx="18.8" cy="11.4" fill="none" r="1.7" stroke={colors.accent} strokeWidth={2} />
        </>,
      );
    case 'swing':
      return hinge(
        <>
          <Path d="M12.4 10.4 L11.2 16.2" {...limb} />
          <Circle cx="10.6" cy="17.6" fill="none" r="1.7" stroke={colors.accent} strokeWidth={2} />
        </>,
      );
    case 'carry':
      return stand(
        <>
          <Path d="M12 8.2 L8.2 13" {...limb} />
          <Path d="M12 8.2 L15.8 13" {...limb} />
          <Path d="M6.2 12.2 H9.4 V17 H6.2 Z" {...bar} />
          <Path d="M14.6 12.2 H17.8 V17 H14.6 Z" {...bar} />
        </>,
      );
    case 'clean':
      return stand(
        <>
          <Path d="M8.6 9.6 H15.4" {...bar} />
          <Path d="M9.2 9.6 L7.6 7.2" {...limb} />
          <Path d="M14.8 9.6 L16.4 7.2" {...limb} />
        </>,
      );
    case 'jump':
      return (
        <>
          <Path d="M13.5 16.2 H21.2 V21.4 H13.5 Z" {...stage} />
          {head(8.4, 4.2)}
          <Path d="M8.4 6.1 V9.2" {...body} />
          <Path d="M8.4 9.2 L5.4 12.4 L7.2 14.6" {...limb} />
          <Path d="M8.4 9.2 L11.8 12.2 L10.2 14.8" {...limb} />
        </>
      );
    case 'kick':
      return (
        <>
          <Path d="M3.5 18.8 H12" {...stage} />
          {head(5.6, 12.2)}
          <Path d="M7.2 13.6 H14.2" {...body} />
          <Path d="M9.2 13.8 V18.6" {...limb} />
          <Path d="M14.2 13.2 L20.4 9.2" {...limb} />
          <Path d="M14 14.2 V18.8" {...limb} />
        </>
      );
    case 'abduct':
      return (
        <>
          <Path d="M4 15 H13 V21 H4 Z" {...stage} />
          {head(7.6, 9.4)}
          <Path d="M8.4 11 V14.6" {...body} />
          <Path d="M8.6 14 L5.4 17.2" {...limb} />
          <Path d="M9.4 14 L15.6 12.2" {...limb} />
          <Path d="M14.2 10.6 H18.4" {...bar} />
        </>
      );
    case 'rollout':
      return (
        <>
          <Path d="M3.5 18.6 H11" {...stage} />
          {head(8, 14)}
          <Path d="M9.4 15.2 L17.2 12.2" {...body} />
          <Circle cx="18.6" cy="11.8" fill="none" r="1.8" stroke={colors.accent} strokeWidth={2} />
        </>
      );
    case 'facepull':
      return stand(
        <>
          <Path d="M21 8.6 H16.4" {...bar} />
          <Path d="M13.2 8.2 L17.6 6.4" {...limb} />
          <Path d="M13.2 9.4 L17.6 11.2" {...limb} />
        </>,
      );
    case 'pullover':
      return lying(
        <>
          <Path d="M9.5 13.2 L5.2 8.4" {...limb} />
          <Circle cx="4.4" cy="7.6" fill="none" r="1.35" stroke={colors.accent} strokeWidth={2} />
        </>,
      );
    case 'upright':
      return stand(
        <>
          <Path d="M9.2 6.2 L12 10.4" {...limb} />
          <Path d="M14.8 6.2 L12 10.4" {...limb} />
          <Path d="M7.4 10.6 H16.6" {...bar} />
        </>,
      );
    case 'frontraise':
      return stand(
        <>
          <Path d="M12 8 L18.4 5.4" {...limb} />
          <Circle cx="19.4" cy="4.8" fill="none" r="1.25" stroke={colors.accent} strokeWidth={2} />
        </>,
      );
    case 'reardelt':
      return hinge(
        <>
          <Path d="M13.2 10.2 L7.4 8" {...limb} />
          <Path d="M12.8 11 L7.6 14.2" {...limb} />
          <Circle cx="6.6" cy="7.6" fill="none" r="1.15" stroke={colors.accent} strokeWidth={2} />
          <Circle cx="6.8" cy="14.6" fill="none" r="1.15" stroke={colors.accent} strokeWidth={2} />
        </>,
      );
    case 'skull':
      return lying(
        <>
          <Path d="M12 13.2 V8" {...limb} />
          <Path d="M12 8 L8.2 9.8" {...limb} />
          <Path d="M6.6 9 H12.4" {...bar} />
        </>,
      );
    case 'overhead':
      return (
        <>
          {head(11.2, 8.8)}
          <Path d="M11.4 10.4 V16.2" {...body} />
          <Path d="M11.4 16.2 L8.8 21" {...limb} />
          <Path d="M11.4 16.2 L14.2 21" {...limb} />
          <Path d="M12.2 11.2 V5.2" {...limb} />
          <Path d="M12.2 5.2 L15.6 7.6" {...limb} />
          <Circle cx="16.6" cy="8.2" fill="none" r="1.35" stroke={colors.accent} strokeWidth={2} />
        </>
      );
    case 'backext':
      return (
        <>
          <Path d="M7 14 H18 V18 H7 Z" {...stage} />
          {head(5.6, 10.2)}
          <Path d="M7.2 11.6 L14.6 13.6" {...body} />
          <Path d="M15.5 14.2 L19.6 20.2" {...limb} />
        </>
      );
    case 'deadbug':
      return (
        <>
          <Path d="M3 18.4 H21" {...stage} />
          {head(6.2, 14.6)}
          <Path d="M8 15.4 H16" {...body} />
          <Path d="M11 14.8 L8.2 10" {...limb} />
          <Path d="M14.2 15.6 L18.6 11.2" {...limb} />
        </>
      );
    case 'generic':
      return stand(
        <>
          <Path d="M12 8.6 L8.4 12.4" {...limb} />
          <Path d="M12 8.6 L15.6 12.4" {...limb} />
          <Path d="M6.6 12.6 H17.4" {...bar} />
        </>,
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
