/**
 * Plays the two Workout Guide frames for an exercise. The heavier source
 * frame is left out. A lift with no drawing falls back to the simple pose.
 */
import React, { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';

import { guideSlugFor, guideSlugForFamily } from '../domain/guide-art';
import { poseForExercise, poseForFamily } from '../domain/movement-pose';
import { colors } from '../theme/colors';
import { exerciseArtFrames } from './exercise-art-frames';
import { MovementFigure } from './movement-figure';

const FRAME_MS = 700;

let frame = 0;
let reduceMotion = false;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function stopTimer(): void {
  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer(): void {
  if (timer != null || reduceMotion || listeners.size === 0) {
    return;
  }
  timer = setInterval(() => {
    frame = (frame + 1) % 2;
    notify();
  }, FRAME_MS);
}

function setReduceMotion(value: boolean): void {
  if (reduceMotion === value) {
    return;
  }
  reduceMotion = value;
  if (value) {
    frame = 0;
    stopTimer();
  } else {
    startTimer();
  }
  notify();
}

void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  startTimer();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopTimer();
    }
  };
}

function currentFrame(): number {
  return reduceMotion ? 0 : frame;
}

function useExerciseFrame(): number {
  return useSyncExternalStore(subscribe, currentFrame, currentFrame);
}

interface ExerciseAnimationProps {
  exerciseId?: string;
  name?: string;
  family?: string;
  size?: number;
}

export const ExerciseAnimation: React.FC<ExerciseAnimationProps> = React.memo(function ExerciseAnimation({ exerciseId = '', name = '', family, size = 44 }) {
  const slug = family ? guideSlugForFamily(family) : guideSlugFor(exerciseId, name);
  const sources = slug ? exerciseArtFrames[slug] : undefined;
  const frameIndex = useExerciseFrame();
  if (!sources) {
    return <MovementFigure pose={family ? poseForFamily(family) : poseForExercise(exerciseId, name)} size={size} />;
  }
  const shown = frameIndex % sources.length;
  const radius = size > 48 ? 16 : 10;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.frame, { borderRadius: radius, height: size, width: size }]}>
      {sources.map((source, index) => (
        <Image
          key={index}
          resizeMode="contain"
          source={source}
          style={{ height: size, left: 0, opacity: index === shown ? 1 : 0, position: 'absolute', top: 0, width: size }}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
});
