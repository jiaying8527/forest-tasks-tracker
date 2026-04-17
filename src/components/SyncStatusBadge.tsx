import { useEffect, useState } from 'react';
import * as syncStatus from '../sync/syncStatus';
import type { SyncStatusSnapshot } from '../sync/syncStatus';
import './SyncStatusBadge.css';

const LABELS: Record<SyncStatusSnapshot['state'], string> = {
  synced: 'All changes synced',
  syncing: 'Syncing…',
  offline: 'Offline — will sync when online',
  error: 'Sync paused — tap to retry',
};

export function SyncStatusBadge({ onRetry }: { onRetry?: () => void }) {
  const [snap, setSnap] = useState<SyncStatusSnapshot>(syncStatus.get());

  useEffect(() => {
    return syncStatus.subscribe(setSnap);
  }, []);

  const clickable = snap.state === 'error' && !!onRetry;

  return (
    <button
      type="button"
      className={`sync-badge sync-badge-${snap.state}`}
      onClick={clickable ? onRetry : undefined}
      disabled={!clickable}
      aria-live="polite"
    >
      <span className="sync-dot" aria-hidden="true" />
      <span>{LABELS[snap.state]}</span>
    </button>
  );
}
