/**
 * Swipe the child left to reveal a red action; a long swipe runs it straight away.
 * Nested swipe rows win their own gestures, so a set row inside a swipeable card deletes the set, not the card.
 */
import React, { useCallback, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, type AccessibilityActionEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme/colors';
import { hapticLight } from './haptics';

/** Width of the button a swipe reveals. */
const ACTION_WIDTH = 84;
/** A swipe past this share of the row deletes without a second tap. */
const FULL_SWIPE = 0.5;

interface SwipeToDeleteProps {
  /** Button text, e.g. "Delete". */
  label: string;
  /** Spoken name of the action, e.g. "Delete set". */
  accessibilityLabel: string;
  onDelete: () => void;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Background of the sliding front. It must be opaque and square; the wrapper rounds and clips it. */
  frontColor?: string;
  testID?: string;
  children: React.ReactNode;
}

export const SwipeToDelete: React.FC<SwipeToDeleteProps> = ({ label, accessibilityLabel, onDelete, radius = 10, style, frontColor = colors.surface, testID, children }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const resting = useRef(0);
  const width = useRef(320);
  const deleteRef = useRef(onDelete);
  deleteRef.current = onDelete;

  const settle = useCallback(
    (to: number) => {
      resting.current = to;
      Animated.spring(translateX, { bounciness: 0, toValue: to, useNativeDriver: false }).start();
    },
    [translateX],
  );

  const removeNow = useCallback(() => {
    resting.current = 0;
    Animated.timing(translateX, { duration: 160, toValue: -width.current, useNativeDriver: false }).start(() => {
      deleteRef.current();
    });
    void hapticLight();
  }, [translateX]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderMove: (_event, gesture) => {
          translateX.setValue(Math.min(0, Math.max(-width.current, resting.current + gesture.dx)));
        },
        onPanResponderRelease: (_event, gesture) => {
          const x = resting.current + gesture.dx;
          if (x < -width.current * FULL_SWIPE) {
            removeNow();
          } else if (x < -ACTION_WIDTH / 2 || gesture.vx < -0.8) {
            settle(-ACTION_WIDTH);
          } else {
            settle(0);
          }
        },
        onPanResponderTerminate: () => settle(resting.current),
        onPanResponderTerminationRequest: () => false,
      }),
    [removeNow, settle, translateX],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    width.current = event.nativeEvent.layout.width;
  }, []);

  const accessibilityActions = useMemo(() => [{ label: accessibilityLabel, name: 'delete' }], [accessibilityLabel]);
  const handleAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'delete') {
        removeNow();
      }
    },
    [removeNow],
  );

  return (
    <View onLayout={handleLayout} style={[styles.wrap, { borderRadius: radius }, style]}>
      <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={removeNow} style={[styles.action, { borderRadius: radius }]}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
      <Animated.View
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAction}
        style={{ backgroundColor: frontColor, transform: [{ translateX }] }}
        testID={testID}
        {...responder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: ACTION_WIDTH,
  },
  actionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  wrap: {
    overflow: 'hidden',
  },
});
