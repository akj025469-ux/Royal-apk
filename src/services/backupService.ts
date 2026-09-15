import { BackupMeta } from '../types';
import { dbInstance } from '../db/indexedDb';

const BACKUP_META_KEY = 'ROYAL_ERP_BACKUP_META';
const LATEST_LOCAL_BACKUP_KEY = 'ROYAL_ERP_LATEST_LOCAL_BACKUP';

export class BackupService {
  private listeners: Array<(meta: BackupMeta) => void> = [];

  getMeta(): BackupMeta {
    try {
      const raw = localStorage.getItem(BACKUP_META_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to read backup meta from storage', e);
    }
    return {
      backupStatus: 'idle',
      automaticBackup: false,
      googleConnected: false,
    };
  }

  saveMeta(meta: Partial<BackupMeta>): BackupMeta {
    const current = this.getMeta();
    const updated: BackupMeta = { ...current, ...meta };
    try {
      localStorage.setItem(BACKUP_META_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist backup meta', e);
    }
    this.notify(updated);
    return updated;
  }

  subscribe(listener: (meta: BackupMeta) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(meta: BackupMeta) {
    this.listeners.forEach((fn) => {
      try {
        fn(meta);
      } catch (err) {
        console.error('BackupService listener error:', err);
      }
    });
  }

  // Get cached latest backup from local device storage
  getLatestLocalBackup(): Record<string, unknown> | null {
    try {
      const raw = localStorage.getItem(LATEST_LOCAL_BACKUP_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to read latest local backup', e);
    }
    return null;
  }

  // Connect Google account credentials/token
  connectGoogleAccount(email: string, token: string, name?: string) {
    return this.saveMeta({
      googleConnected: true,
      googleUserEmail: email,
      googleAccountName: name || email.split('@')[0],
      googleAccessToken: token,
      lastError: undefined,
    });
  }

  // Disconnect Google Account
  disconnectGoogleAccount() {
    return this.saveMeta({
      googleConnected: false,
      googleUserEmail: undefined,
      googleAccountName: undefined,
      googleAccessToken: undefined,
      backupStatus: 'idle',
      lastError: undefined,
    });
  }

  // Toggle Automatic Backup
  setAutomaticBackup(enabled: boolean): BackupMeta {
    const current = this.getMeta();
    const newStatus = enabled && !navigator.onLine ? 'pending' : current.backupStatus;
    return this.saveMeta({
      automaticBackup: enabled,
      backupStatus: newStatus,
    });
  }

  // Export and download backup JSON file to device
  async downloadLocalBackupFile(): Promise<{ filename: string; totalRecords: number }> {
    const snapshot = await dbInstance.exportFullSnapshot();
    const datePart = new Date().toISOString().slice(0, 10);
    const filename = `ROYAL_ERP_BACKUP_${datePart}.json`;

    // Cache locally as latest backup
    try {
      localStorage.setItem(LATEST_LOCAL_BACKUP_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('Could not cache full snapshot in localStorage (storage quota):', e);
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', filename);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    return {
      filename,
      totalRecords: (snapshot.totalRecords as number) || 0,
    };
  }

  // Execute backup (Manual or Automatic)
  async performBackup(isAuto = false): Promise<{
    success: boolean;
    timestamp?: string;
    error?: string;
    isOffline?: boolean;
    recordsCount?: number;
  }> {
    const attemptTime = new Date().toISOString();
    this.saveMeta({
      lastBackupAttempt: attemptTime,
      backupStatus: 'in_progress',
    });

    // 1. Gather all database records safely from IndexedDB
    let snapshot: Record<string, unknown>;
    try {
      snapshot = await dbInstance.exportFullSnapshot();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to export local database snapshot';
      this.saveMeta({
        backupStatus: 'failed',
        lastError: `Database export error: ${msg}`,
      });
      return { success: false, error: msg };
    }

    // Always preserve latest verified snapshot in local persistent cache
    try {
      localStorage.setItem(LATEST_LOCAL_BACKUP_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('Quota exceeded caching latest backup locally', e);
    }

    const recordsCount = (snapshot.totalRecords as number) || 0;

    // 2. Check internet status
    if (!navigator.onLine) {
      const currentMeta = this.getMeta();
      const status = currentMeta.automaticBackup ? 'pending' : 'failed';
      const offlineMsg = 'Internet connection unavailable. Your data is saved locally.';
      this.saveMeta({
        backupStatus: status,
        lastError: currentMeta.automaticBackup
          ? 'Offline: Data preserved locally. Backup Pending until internet is restored.'
          : offlineMsg,
        totalRecordsCount: recordsCount,
      });
      return {
        success: false,
        isOffline: true,
        error: offlineMsg,
        recordsCount,
      };
    }

    // 3. Online: Check Google Drive configuration & token
    const meta = this.getMeta();
    if (!meta.googleConnected || !meta.googleAccessToken) {
      const configError =
        'Google Drive configuration/authentication is required. Please connect your Google account to backup to Google Drive.';
      this.saveMeta({
        backupStatus: 'failed',
        lastError: configError,
        totalRecordsCount: recordsCount,
      });
      return {
        success: false,
        error: configError,
        recordsCount,
      };
    }

    // 4. Perform real Google Drive multipart upload
    try {
      const boundary = '-------RoyalDairyBoundary' + Date.now();
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const fileName = `ROYAL_ERP_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const fileMetadata = {
        name: fileName,
        mimeType: 'application/json',
        description: `ROYAL ERP Amul Distribution Database Backup (${recordsCount} records)`,
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(fileMetadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(snapshot, null, 2) +
        closeDelim;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${meta.googleAccessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: multipartRequestBody,
      });

      if (!response.ok) {
        let errDetail = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson?.error?.message) {
            errDetail = errJson.error.message;
          }
        } catch {
          // ignore
        }

        if (response.status === 401) {
          errDetail = 'Google Drive access token expired or unauthorized. Please re-authenticate your Google Account.';
        }

        this.saveMeta({
          backupStatus: 'failed',
          lastError: `Google Drive upload failed: ${errDetail}`,
          totalRecordsCount: recordsCount,
        });

        return {
          success: false,
          error: `Google Drive upload failed: ${errDetail}`,
          recordsCount,
        };
      }

      // Success!
      const successTime = new Date().toISOString();
      this.saveMeta({
        lastSuccessfulBackup: successTime,
        backupStatus: 'success',
        lastError: undefined,
        totalRecordsCount: recordsCount,
      });

      return {
        success: true,
        timestamp: successTime,
        recordsCount,
      };
    } catch (networkErr: unknown) {
      const errMsg = networkErr instanceof Error ? networkErr.message : 'Network error communicating with Google Drive';
      this.saveMeta({
        backupStatus: meta.automaticBackup ? 'pending' : 'failed',
        lastError: `Backup error: ${errMsg}`,
        totalRecordsCount: recordsCount,
      });
      return {
        success: false,
        error: errMsg,
        recordsCount,
      };
    }
  }

  // Validate backup data
  validateBackupData(data: unknown) {
    return dbInstance.validateSnapshot(data);
  }

  // Restore snapshot data
  async restoreSnapshot(data: Record<string, unknown>) {
    return await dbInstance.importSnapshot(data);
  }
}

export const backupService = new BackupService();
