/**
 * State for the first-run tour: which step is showing, and where the element it
 * highlights sits on screen. `useTutorialTarget` registers that element, and
 * `signal` moves the tour on when the user does the action the step describes.
 * The drawing lives in `tour-overlay.tsx`.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { type ViewInstance } from 'react-native';

import { advanceTour, TOUR_STEPS, type TourSignal, type TourStep } from '../../domain/tutorial';

export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Props to spread on the element a step points at, so it can be measured. */
export interface TourAnchor {
  ref: (node: ViewInstance | null) => void;
  onLayout: () => void;
  collapsable: false;
}

interface TourContextValue {
  open: boolean;
  index: number;
  step: TourStep;
  targets: Record<string, TourRect>;
  close: () => void;
  signal: (event: TourSignal) => void;
  registerTarget: (id: string, rect: TourRect) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

interface TourProviderProps {
  open: boolean;
  /** Bumped by Show again, so reopening restarts even when the tour never closed. */
  restartKey?: number;
  onClose: () => void;
  children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ open, restartKey = 0, onClose, children }) => {
  const [index, setIndex] = useState(0);
  const [targets, setTargets] = useState<Record<string, TourRect>>({});
  const openRef = useRef(open);
  openRef.current = open;

  // A first run starts at the beginning, and profile can open it again later.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setTargets({});
    }
  }, [open, restartKey]);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);
  const signal = useCallback((event: TourSignal) => {
    if (!openRef.current) {
      return;
    }
    setIndex((current) => advanceTour(current, event) ?? current);
  }, []);
  const registerTarget = useCallback((id: string, rect: TourRect) => {
    setTargets((previous) => {
      const existing = previous[id];
      if (
        existing &&
        Math.abs(existing.x - rect.x) < 1 &&
        Math.abs(existing.y - rect.y) < 1 &&
        Math.abs(existing.width - rect.width) < 1 &&
        Math.abs(existing.height - rect.height) < 1
      ) {
        return previous;
      }
      return { ...previous, [id]: rect };
    });
  }, []);

  const step = TOUR_STEPS[index] ?? TOUR_STEPS[0];
  const value = useMemo<TourContextValue>(
    () => ({ close, index, open, registerTarget, signal, step, targets }),
    [close, index, open, registerTarget, signal, step, targets],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export function useTour(): TourContextValue {
  const value = useContext(TourContext);
  if (!value) {
    throw new Error('useTour needs a TourProvider above it.');
  }
  return value;
}

/**
 * Registers the element a tour step points at. Measuring only happens while the
 * step is the current one, so nothing is measured on an ordinary session.
 */
export function useTutorialTarget(id: string): TourAnchor {
  const { open, registerTarget, step } = useTour();
  const node = useRef<ViewInstance | null>(null);
  const active = open && step.target === id;

  const measure = useCallback(() => {
    if (!active) {
      return;
    }
    node.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        registerTarget(id, { height, width, x, y });
      }
    });
  }, [active, id, registerTarget]);

  // Runs after every render while the step is active: the element can mount late,
  // such as the Finish bar when the rest timer ends, and onLayout alone misses it.
  // Measuring again once the navigation animation settles fixes a rect captured
  // while a pushed screen was still sliding in.
  useEffect(() => {
    if (!active) {
      return;
    }
    measure();
    // Measure again once a pushed screen has finished sliding in, so the ring is
    // not left where the element was mid-animation.
    const timer = setTimeout(measure, 350);
    return () => clearTimeout(timer);
  });

  const setNode = useCallback((next: ViewInstance | null) => {
    node.current = next;
  }, []);
  const onLayout = useCallback(() => {
    measure();
  }, [measure]);

  return useMemo(() => ({ collapsable: false as const, onLayout, ref: setNode }), [onLayout, setNode]);
}
