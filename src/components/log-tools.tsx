/**
 * Export, import, backup, and restore for the on-device log.
 * Lives under Profile → Settings so History stays a browse list.
 */
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { exportLogBackup, getInProgressWorkoutId, getSettings, importWorkoutCsv, listWorkoutsForExport, openLogBackup, restoreLogBackup } from '../data/repository';
import { workoutsToCsv } from '../domain/log-export';
import { shareBackupFile } from '../features/history/share-backup';
import { activeWorkoutChanged, dataChanged, useAppDispatch, warmupRestMultiplierChanged, weightUnitChanged } from '../state/store';
import { colors } from '../theme/colors';
import { hitTarget, space } from '../theme/spacing';
import { type } from '../theme/typography';

export const LogTools: React.FC = () => {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);

  const applyBackup = useCallback(
    async (raw: string) => {
      const next = openLogBackup(raw);
      await restoreLogBackup(next);
      const settings = getSettings.now();
      if (settings) {
        dispatch(weightUnitChanged(settings.weightUnit));
        dispatch(warmupRestMultiplierChanged(settings.warmupRestMultiplier));
      }
      dispatch(activeWorkoutChanged(getInProgressWorkoutId.now()));
      dispatch(dataChanged());
      Alert.alert('Backup restored', 'The log on this phone now matches that file.');
    },
    [dispatch],
  );

  const handleImportCsv = useCallback(async () => {
    if (busy) {
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'],
      });
      if (picked.canceled || !picked.assets?.[0]?.uri) {
        return;
      }
      setBusy(true);
      const response = await fetch(picked.assets[0].uri);
      const summary = await importWorkoutCsv(await response.text());
      dispatch(dataChanged());
      const parts = [summary.importedWorkouts === 1 ? '1 workout imported' : `${summary.importedWorkouts} workouts imported`];
      if (summary.skippedDuplicates > 0) {
        parts.push(`${summary.skippedDuplicates} already in History`);
      }
      if (summary.createdExercises > 0) {
        parts.push(`${summary.createdExercises} new exercises added`);
      }
      if (summary.skippedCardioRows > 0) {
        parts.push(`${summary.skippedCardioRows} cardio rows skipped`);
      }
      Alert.alert(`${summary.sourceLabel} import`, `${parts.join('. ')}.`);
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not import that file.');
    } finally {
      setBusy(false);
    }
  }, [busy, dispatch]);

  const handleExportCsv = useCallback(async () => {
    const rows = listWorkoutsForExport.now();
    if (!rows || rows.length === 0) {
      Alert.alert('Nothing to export', 'Finish a workout first.');
      return;
    }
    try {
      await Share.share({ message: workoutsToCsv(rows), title: 'Rep workouts.csv' });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message && !/cancel|abort/i.test(message)) {
        Alert.alert('Export failed', message);
      }
    }
  }, []);

  const handleBackup = useCallback(async () => {
    if (busy) {
      return;
    }
    try {
      setBusy(true);
      const file = await exportLogBackup();
      await shareBackupFile(file.filename, file.contents);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message && !/cancel|abort|did not share/i.test(message)) {
        Alert.alert('Backup failed', message);
      }
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const handleRestore = useCallback(async () => {
    if (busy) {
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['application/json', 'text/json', '*/*'],
      });
      if (picked.canceled || !picked.assets?.[0]?.uri) {
        return;
      }
      const response = await fetch(picked.assets[0].uri);
      const raw = await response.text();
      openLogBackup(raw);
      Alert.alert('Replace this log?', 'This backup overwrites the workouts, routines, and settings on this phone.', [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => {
            setBusy(true);
            void applyBackup(raw)
              .catch((error: unknown) => {
                Alert.alert('Restore failed', error instanceof Error ? error.message : 'Could not restore that file.');
              })
              .finally(() => setBusy(false));
          },
          style: 'destructive',
          text: 'Restore',
        },
      ]);
    } catch (error) {
      Alert.alert('Restore failed', error instanceof Error ? error.message : 'Could not restore that file.');
    }
  }, [applyBackup, busy]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.caption}>Log</Text>
      <ToolButton disabled={busy} label="Export CSV" onPress={() => void handleExportCsv()} />
      <ToolButton disabled={busy} label="Import CSV" onPress={() => void handleImportCsv()} />
      <ToolButton disabled={busy} label="Backup" onPress={() => void handleBackup()} />
      <ToolButton disabled={busy} label="Restore" onPress={() => void handleRestore()} />
    </View>
  );
};

const ToolButton: React.FC<{ label: string; onPress: () => void; disabled?: boolean }> = ({ disabled, label, onPress }) => (
  <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.row, disabled && styles.disabled]}>
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  caption: {
    ...type.caption1,
    color: colors.muted,
    fontWeight: '600',
    marginBottom: space.xs,
    marginTop: space.md,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...type.body,
    color: colors.text,
    fontWeight: '600',
  },
  row: {
    justifyContent: 'center',
    minHeight: hitTarget,
    paddingVertical: space.xs,
  },
  wrap: {
    marginTop: space.sm,
  },
});
