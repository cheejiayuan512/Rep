/**
 * Hands the backup file to the system share sheet. On the web it downloads.
 */
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function shareBackupFile(filename: string, contents: string): Promise<void> {
  if (Platform.OS === 'web') {
    downloadBackup(filename, contents);
    return;
  }
  const file = new File(Paths.cache, filename);
  file.create(file.exists ? { overwrite: true } : undefined);
  file.writeSync(contents);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, Platform.OS === 'android' ? { dialogTitle: 'Rep backup', mimeType: 'application/json' } : undefined);
}

function downloadBackup(filename: string, contents: string): void {
  const doc = globalThis.document;
  if (!doc) {
    throw new Error('Could not download the backup.');
  }
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
