/**
 * A vertical list of cards of any height, reordered by dragging a handle.
 * Each card gets `panHandlers` to spread on its handle. The other cards slide
 * out of the way while dragging; `onReorder` gets the new id order on release.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderHandlers, type LayoutChangeEvent } from 'react-native';

import { hapticLight } from './haptics';

export interface SortHandle {
  panHandlers: GestureResponderHandlers;
  dragging: boolean;
}

interface SortableListProps<T> {
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, handle: SortHandle) => React.ReactNode;
  onReorder: (ids: string[]) => void;
  /** The parent should stop scrolling while this is true. */
  onDraggingChange?: (dragging: boolean) => void;
}

interface Drag {
  id: string;
  from: number;
  to: number;
  dy: number;
}

interface Slot {
  y: number;
  height: number;
}

export function SortableList<T>({ items, keyOf, renderItem, onReorder, onDraggingChange }: SortableListProps<T>) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const slots = useRef(new Map<string, Slot>());
  const ids = useMemo(() => items.map(keyOf), [items, keyOf]);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const onDraggingRef = useRef(onDraggingChange);
  onDraggingRef.current = onDraggingChange;

  const update = useCallback((next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const grant = useCallback(
    (id: string) => {
      const from = idsRef.current.indexOf(id);
      if (from < 0) {
        return;
      }
      update({ dy: 0, from, id, to: from });
      onDraggingRef.current?.(true);
      void hapticLight();
    },
    [update],
  );

  const move = useCallback(
    (id: string, dy: number) => {
      const current = dragRef.current;
      const order = idsRef.current;
      const own = slots.current.get(id);
      if (!current || current.id !== id || !own) {
        return;
      }
      const last = slots.current.get(order[order.length - 1] ?? '');
      const bottom = last ? last.y + last.height : own.y + own.height;
      const clamped = Math.min(bottom - own.y - own.height, Math.max(-own.y, dy));
      const center = own.y + own.height / 2 + clamped;
      let to = 0;
      for (const other of order) {
        const slot = slots.current.get(other);
        if (other !== id && slot && slot.y + slot.height / 2 < center) {
          to += 1;
        }
      }
      if (to !== current.to) {
        void hapticLight();
      }
      update({ ...current, dy: clamped, to });
    },
    [update],
  );

  const release = useCallback(() => {
    const current = dragRef.current;
    update(null);
    onDraggingRef.current?.(false);
    if (!current || current.from === current.to) {
      return;
    }
    const next = idsRef.current.filter((id) => id !== current.id);
    next.splice(current.to, 0, current.id);
    onReorderRef.current(next);
  }, [update]);

  const measure = useCallback((id: string, slot: Slot) => {
    slots.current.set(id, slot);
  }, []);

  const draggedHeight = drag ? (slots.current.get(drag.id)?.height ?? 0) : 0;

  return (
    <View>
      {items.map((item, index) => {
        const id = ids[index] ?? '';
        const dragging = drag?.id === id;
        const offset = drag == null ? 0 : dragging ? drag.dy : shiftFor(index, drag.from, drag.to) * draggedHeight;
        return (
          <SortableItem dragging={dragging} grant={grant} id={id} key={id} measure={measure} move={move} offset={offset} release={release}>
            {(panHandlers) => renderItem(item, { dragging, panHandlers })}
          </SortableItem>
        );
      })}
    </View>
  );
}

function shiftFor(index: number, from: number, to: number): number {
  if (from < to && index > from && index <= to) {
    return -1;
  }
  if (from > to && index < from && index >= to) {
    return 1;
  }
  return 0;
}

interface SortableItemProps {
  id: string;
  offset: number;
  dragging: boolean;
  grant: (id: string) => void;
  move: (id: string, dy: number) => void;
  release: () => void;
  measure: (id: string, slot: Slot) => void;
  children: (panHandlers: GestureResponderHandlers) => React.ReactNode;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, offset, dragging, grant, move, release, measure, children }) => {
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => grant(id),
        onPanResponderMove: (_event, gesture) => move(id, gesture.dy),
        onPanResponderRelease: release,
        onPanResponderTerminate: release,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onStartShouldSetPanResponder: () => true,
      }),
    [grant, id, move, release],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height, y } = event.nativeEvent.layout;
      measure(id, { height, y });
    },
    [id, measure],
  );

  return (
    <View onLayout={handleLayout} style={[{ transform: [{ translateY: offset }] }, dragging && styles.dragging]}>
      {children(pan.panHandlers)}
    </View>
  );
};

const styles = StyleSheet.create({
  dragging: {
    opacity: 0.92,
    zIndex: 2,
  },
});
