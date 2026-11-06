/**
 * Draws the tour: a dimmed page with a hole over the element the step points at,
 * and a card with the copy. The dim deliberately covers everything except the
 * hole, so the only thing the user can tap is the thing the step describes.
 * Taps in the hole reach the real control underneath, which is how the tour
 * keeps moving through the app.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOUR_STEPS, type TourScreen } from '../../domain/tutorial';
import { colors } from '../../theme/colors';
import { useTour, type TourRect } from './tour';

/** Room around the highlighted element so the ring does not sit on it. */
const HOLE_PADDING = 8;

interface TourOverlayProps {
  screen: TourScreen;
  /** Hide it while a keypad or sheet covers the page. */
  hidden?: boolean;
  /** True when this screen draws to the bottom of the window and owns its inset. */
  bottomInset?: boolean;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({ screen, hidden = false, bottomInset = false }) => {
  const { back, close, index, open, step, targets } = useTour();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  if (!open || hidden || step.screen !== screen) {
    return null;
  }

  const rect = step.target ? targets[step.target] : undefined;
  const hole = rect ? holeAround(rect, insets.left, insets.top) : null;
  const placeCardOnTop = hole != null && hole.y + hole.height / 2 > height * 0.55;
  const previous = index > 0 ? TOUR_STEPS[index - 1] : null;
  const canGoBack = previous != null && previous.screen === step.screen;

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {hole ? (
        <>
          <View style={[styles.dim, { height: Math.max(0, hole.y), left: 0, right: 0, top: 0 }]} />
          <View style={[styles.dim, { bottom: 0, left: 0, right: 0, top: hole.y + hole.height }]} />
          <View style={[styles.dim, { height: hole.height, left: 0, top: hole.y, width: Math.max(0, hole.x) }]} />
          <View style={[styles.dim, { height: hole.height, left: hole.x + hole.width, right: 0, top: hole.y }]} />
          <View pointerEvents="none" style={[styles.ring, { height: hole.height, left: hole.x, top: hole.y, width: hole.width }]} />
        </>
      ) : (
        <View pointerEvents="none" style={styles.fullDim} />
      )}
      <View
        accessibilityLiveRegion="polite"
        style={[styles.card, placeCardOnTop ? { top: insets.top + 16 } : { bottom: 16 + (bottomInset ? insets.bottom : 0) }]}
      >
        <Text style={styles.kicker}>
          {index + 1} of {TOUR_STEPS.length}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {step.title}
        </Text>
        <Text style={styles.body}>{step.body}</Text>
        <View style={styles.dots}>
          {TOUR_STEPS.map((item, dot) => (
            <View key={item.id} style={[styles.dot, dot === index && styles.dotOn]} />
          ))}
        </View>
        {step.primary === 'none' ? <Text style={styles.hint}>Tap the highlighted area to continue.</Text> : null}
        <View style={styles.actions}>
          {canGoBack ? (
            <Pressable accessibilityRole="button" onPress={back} style={styles.quiet}>
              <Text style={styles.quietText}>Back</Text>
            </Pressable>
          ) : null}
          {step.primary === 'none' ? (
            <Pressable accessibilityLabel="Skip the tutorial" accessibilityRole="button" onPress={close} style={styles.quiet}>
              <Text style={styles.quietText}>Skip</Text>
            </Pressable>
          ) : null}
          <View style={styles.spacer} />
          {step.primary === 'done' ? (
            <Pressable accessibilityRole="button" onPress={close} style={styles.next}>
              <Text style={styles.nextText}>Got it</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
};

/** Window coordinates to page coordinates, with room for the ring. */
function holeAround(rect: TourRect, insetLeft: number, insetTop: number): TourRect {
  return {
    height: rect.height + HOLE_PADDING * 2,
    width: rect.width + HOLE_PADDING * 2,
    x: rect.x - insetLeft - HOLE_PADDING,
    y: rect.y - insetTop - HOLE_PADDING,
  };
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    left: 16,
    padding: 20,
    position: 'absolute',
    right: 16,
  },
  dim: {
    backgroundColor: colors.overlay,
    position: 'absolute',
  },
  dot: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  dotOn: {
    backgroundColor: colors.accent,
    width: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 16,
  },
  fullDim: {
    backgroundColor: colors.overlay,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 12,
  },
  kicker: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '700',
  },
  next: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  nextText: {
    color: colors.accentInk,
    fontSize: 16,
    fontWeight: '800',
  },
  quiet: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
  },
  quietText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  ring: {
    borderColor: colors.accent,
    borderRadius: 14,
    borderWidth: 2,
    position: 'absolute',
  },
  root: {
    bottom: 0,
    elevation: 30,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  spacer: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
  },
});
