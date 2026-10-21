/**
 * The workout reorder mode. A long press on an exercise opens this list.
 * Drag a row to a new slot. The parent saves when the person taps Done.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { hapticLight } from './haptics';
import { colors } from '../theme/colors';

export interface OrderRow {
  id: string;
  name: string;
  detail: string;
}

interface ExerciseOrderListProps {
  items: OrderRow[];
  onChange: (ids: string[]) => void;
  onDraggingChange: (dragging: boolean) => void;
}

const ROW_HEIGHT = 76;

export const ExerciseOrderList: React.FC<ExerciseOrderListProps> = ({ items, onChange, onDraggingChange }) => {
  const [rows, setRows] = useState(items);
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number } | null>(null);
  const dragRef = useRef(drag);
  const rowsRef = useRef(rows);
  const onChangeRef = useRef(onChange);
  const onDraggingChangeRef = useRef(onDraggingChange);
  dragRef.current = drag;
  rowsRef.current = rows;
  onChangeRef.current = onChange;
  onDraggingChangeRef.current = onDraggingChange;

  const grant = useCallback((index: number) => {
    dragRef.current = { dy: 0, from: index, to: index };
    setDrag(dragRef.current);
    onDraggingChangeRef.current(true);
    void hapticLight();
  }, []);

  const move = useCallback((index: number, dy: number) => {
    const current = dragRef.current;
    if (!current || current.from !== index) {
      return;
    }
    const count = rowsRef.current.length;
    const min = -current.from * ROW_HEIGHT;
    const max = (count - 1 - current.from) * ROW_HEIGHT;
    const clamped = Math.min(max, Math.max(min, dy));
    const to = current.from + Math.round(clamped / ROW_HEIGHT);
    const next = { dy: clamped, from: current.from, to };
    dragRef.current = next;
    setDrag(next);
  }, []);

  const release = useCallback(() => {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    onDraggingChangeRef.current(false);
    if (!current || current.from === current.to) {
      return;
    }
    setRows((previous) => {
      const next = previous.slice();
      const [moved] = next.splice(current.from, 1);
      if (!moved) {
        return previous;
      }
      next.splice(current.to, 0, moved);
      onChangeRef.current(next.map((row) => row.id));
      return next;
    });
  }, []);

  return (
    <View style={{ height: rows.length * ROW_HEIGHT }}>
      {rows.map((row, index) => (
        <OrderItem
          detail={row.detail}
          drag={drag}
          grant={grant}
          index={index}
          key={row.id}
          move={move}
          name={row.name}
          release={release}
        />
      ))}
    </View>
  );
};

interface OrderItemProps {
  index: number;
  name: string;
  detail: string;
  drag: { from: number; to: number; dy: number } | null;
  grant: (index: number) => void;
  move: (index: number, dy: number) => void;
  release: () => void;
}

const OrderItem: React.FC<OrderItemProps> = ({ detail, drag, grant, index, move, name, release }) => {
  const grantRef = useRef(grant);
  const moveRef = useRef(move);
  const releaseRef = useRef(release);
  grantRef.current = grant;
  moveRef.current = move;
  releaseRef.current = release;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => grantRef.current(index),
        onPanResponderMove: (_event, gesture) => moveRef.current(index, gesture.dy),
        onPanResponderRelease: () => releaseRef.current(),
        onPanResponderTerminate: () => releaseRef.current(),
        onPanResponderTerminationRequest: () => false,
        onStartShouldSetPanResponder: () => true,
      }),
    [index],
  );

  const dragging = drag?.from === index;
  const shift = drag && !dragging ? slotShift(index, drag.from, drag.to) : 0;
  const translateY = dragging ? drag.dy : shift;

  return (
    <View
      accessibilityLabel={`${name}, position ${index + 1}`}
      accessibilityRole="button"
      style={[styles.slot, { top: index * ROW_HEIGHT, transform: [{ translateY }] }, dragging ? styles.slotDragging : null]}
      {...pan.panHandlers}
    >
      <Text style={styles.index}>{index + 1}</Text>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text numberOfLines={1} style={styles.detail}>
          {detail}
        </Text>
      </View>
      <Grip />
    </View>
  );
};

const Grip: React.FC = () => {
  return (
    <View style={styles.grip}>
      <View style={styles.gripBar} />
      <View style={styles.gripBar} />
      <View style={styles.gripBar} />
    </View>
  );
};

function slotShift(index: number, from: number, to: number): number {
  if (from < to && index > from && index <= to) {
    return -ROW_HEIGHT;
  }
  if (from > to && index < from && index >= to) {
    return ROW_HEIGHT;
  }
  return 0;
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
  },
  detail: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  grip: {
    gap: 4,
    marginLeft: 12,
  },
  gripBar: {
    backgroundColor: colors.faint,
    borderRadius: 2,
    height: 2,
    width: 18,
  },
  index: {
    color: colors.accent,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    marginRight: 12,
    width: 24,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  slot: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    height: ROW_HEIGHT - 8,
    left: 0,
    paddingHorizontal: 14,
    position: 'absolute',
    right: 0,
    userSelect: 'none',
  },
  slotDragging: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.accent,
    zIndex: 2,
  },
});
