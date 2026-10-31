/**
 * Shared memory for the whole app: whether startup finished, kg or lb,
 * how long warmups rest, and which workout is open.
 * The sets themselves are not stored here. Screens load those from src/data.
 * `revision` is a counter. Screens reload their lists when it goes up.
 */
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

import { DEFAULT_WARMUP_MULTIPLIER } from '../domain/rest';
import type { WeightUnit } from '../domain/types';

interface AppState {
  ready: boolean;
  bootError: string | null;
  weightUnit: WeightUnit;
  /** Warmup rest as a fraction of the exercise's rest. */
  warmupRestMultiplier: number;
  activeWorkoutId: string | null;
  revision: number;
  /** The first-run tutorial, also opened again from Profile. */
  tutorialOpen: boolean;
}

const initialState: AppState = {
  activeWorkoutId: null,
  bootError: null,
  ready: false,
  revision: 0,
  tutorialOpen: false,
  warmupRestMultiplier: DEFAULT_WARMUP_MULTIPLIER,
  weightUnit: 'kg',
};

const appSlice = createSlice({
  initialState,
  name: 'app',
  reducers: {
    activeWorkoutChanged(state, action: PayloadAction<string | null>) {
      state.activeWorkoutId = action.payload;
    },
    bootFailed(state, action: PayloadAction<string>) {
      state.bootError = action.payload;
      state.ready = false;
    },
    bootstrapped(state, action: PayloadAction<{ weightUnit: WeightUnit; warmupRestMultiplier: number; activeWorkoutId: string | null; showTutorial: boolean }>) {
      state.activeWorkoutId = action.payload.activeWorkoutId;
      state.bootError = null;
      state.ready = true;
      state.tutorialOpen = action.payload.showTutorial;
      state.warmupRestMultiplier = action.payload.warmupRestMultiplier;
      state.weightUnit = action.payload.weightUnit;
    },
    tutorialClosed(state) {
      state.tutorialOpen = false;
    },
    tutorialRequested(state) {
      state.tutorialOpen = true;
    },
    dataChanged(state) {
      state.revision += 1;
    },
    warmupRestMultiplierChanged(state, action: PayloadAction<number>) {
      state.warmupRestMultiplier = action.payload;
    },
    weightUnitChanged(state, action: PayloadAction<WeightUnit>) {
      state.weightUnit = action.payload;
    },
  },
});

export const { activeWorkoutChanged, bootFailed, bootstrapped, dataChanged, tutorialClosed, tutorialRequested, warmupRestMultiplierChanged, weightUnitChanged } = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
