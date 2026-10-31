/**
 * A full copy of the on-device log. CSV export is a Strong spreadsheet and
 * drops fields. This file is the document itself.
 */
export const BACKUP_FORMAT = 'rep.backup';

export function encodeBackup(document: object, exportedAt: number): string {
  return JSON.stringify({ document, exportedAt, format: BACKUP_FORMAT });
}

export function backupFilename(now: number): string {
  const date = new Date(now);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `Rep-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/** The log inside a backup file, or the raw text when the file is already a log. */
export function readBackupDocument(raw: string): string {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('That file is not a Rep backup.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('That file is not a Rep backup.');
  }
  const record = value as { document?: unknown; format?: unknown };
  if (record.format === undefined) {
    return raw;
  }
  if (record.format !== BACKUP_FORMAT || !record.document || typeof record.document !== 'object' || Array.isArray(record.document)) {
    throw new Error('That file is not a Rep backup.');
  }
  return JSON.stringify(record.document);
}
