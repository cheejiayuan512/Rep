import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

import type { WeightUnit } from '../domain/types';

interface AppState {
  ready: boolean;
  bootError: string | null;
  weightUnit: WeightUnit;
  restSeconds: number;
  activeWorkoutId: string | null;
  revision: number;
}

const initialState: AppState = {
  activeWorkoutId: null,
  bootError: null,
  ready: false,
  restSeconds: 90,
  revision: 0,
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
    bootstrapped(state, action: PayloadAction<{ weightUnit: WeightUnit; restSeconds: number; activeWorkoutId: string | null }>) {
      state.activeWorkoutId = action.payload.activeWorkoutId;
      state.bootError = null;
      state.ready = true;
      state.restSeconds = action.payload.restSeconds;
      state.weightUnit = action.payload.weightUnit;
    },
    dataChanged(state) {
      state.revision += 1;
    },
    restSecondsChanged(state, action: PayloadAction<number>) {
      state.restSeconds = action.payload;
    },
    weightUnitChanged(state, action: PayloadAction<WeightUnit>) {
      state.weightUnit = action.payload;
    },
  },
});

export const { activeWorkoutChanged, bootFailed, bootstrapped, dataChanged, restSecondsChanged, weightUnitChanged } = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
