// import { useRef } from 'react';
// import { useAppDispatch, useAppState, useStore } from '../state/store';
import { useAuth } from '../auth/useAuth';
import { isSupabaseConfigured } from '../auth/supabase';
import { CategoryEditor } from '../components/CategoryEditor';
import { StatusEditor } from '../components/StatusEditor';
import { SignInForm } from '../components/SignInForm';
import { SignOutButton } from '../components/SignOutButton';
import { SyncStatusBadge } from '../components/SyncStatusBadge';
// import { exportToBlob, triggerDownload, parseImport } from '../lib/exportImport';
// import { nowLocalISO } from '../lib/dates';
import './SettingsRoute.css';

export function SettingsRoute() {
  // const state = useAppState();
  // const dispatch = useAppDispatch();
  // const { showToast } = useStore();
  const auth = useAuth();
  // const fileRef = useRef<HTMLInputElement>(null);

  // const onExport = () => {
  //   const blob = exportToBlob(state);
  //   const stamp = new Date().toISOString().slice(0, 10);
  //   triggerDownload(blob, `forest-tasks-tracker-${stamp}.json`);
  //   dispatch({ type: 'setLastExportAt', at: nowLocalISO() });
  //   showToast({ kind: 'success', message: 'Exported your data.' });
  // };

  // const onPickImport = () => fileRef.current?.click();

  // const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   e.target.value = '';
  //   if (!file) return;
  //   const text = await file.text();
  //   const result = parseImport(text);
  //   if (!result.ok) {
  //     showToast({ kind: 'error', message: `Import failed: ${result.error}` });
  //     return;
  //   }
  //   const confirmed = window.confirm(
  //     'Importing will replace your current tasks, categories, statuses, and forest with the contents of this file. This cannot be undone.',
  //   );
  //   if (!confirmed) return;
  //   dispatch({ type: 'replaceState', state: result.state });
  //   const s = result.state;
  //   showToast({
  //     kind: 'success',
  //     message: `Restored ${s.tasks.length} tasks, ${s.categories.length} categories, ${s.statuses.length} statuses, ${s.trees.length} trees.`,
  //   });
  // };

  return (
    <section className="route-settings">
      <h1>Settings</h1>

      {isSupabaseConfigured ? (
        <section className="settings-block">
          <h2>Sync across devices</h2>
          {auth.status === 'signedIn' ? (
            <div className="settings-signed-in">
              <p className="settings-hint">
                Signed in as <strong>{auth.email}</strong>. Your tasks sync
                automatically across devices when you're online.
              </p>
              <div className="settings-actions">
                <SyncStatusBadge />
                <SignOutButton />
              </div>
            </div>
          ) : (
            <SignInForm />
          )}
        </section>
      ) : null}

      <details className="settings-block settings-collapsible">
        <summary className="settings-summary">
          <span>Categories</span>
          <span className="settings-summary-chevron" aria-hidden="true">▾</span>
        </summary>
        <div className="settings-collapsible-body">
          <CategoryEditor />
        </div>
      </details>

      <details className="settings-block settings-collapsible">
        <summary className="settings-summary">
          <span>Statuses</span>
          <span className="settings-summary-chevron" aria-hidden="true">▾</span>
        </summary>
        <div className="settings-collapsible-body">
          <StatusEditor />
        </div>
      </details>

      {/*
      <section className="settings-block">
        <h2>Motion</h2>
        <label className="settings-field">
          <span>Reduce motion</span>
          <select
            value={state.prefs.reducedMotion}
            onChange={(e) =>
              dispatch({
                type: 'setReducedMotion',
                pref: e.target.value as 'system' | 'always' | 'never',
              })
            }
          >
            <option value="system">Match system</option>
            <option value="always">Always reduce</option>
            <option value="never">Never reduce</option>
          </select>
        </label>
      </section>
      */}

      {/*
      <section className="settings-block">
        <h2>Backup</h2>
        <p className="settings-hint">
          Your data lives in this browser. Export to a file to back it up or move
          to another device.
        </p>
        <div className="settings-actions">
          <button className="btn btn-primary" onClick={onExport}>
            Export data
          </button>
          <button className="btn btn-secondary" onClick={onPickImport}>
            Import data
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onImportFile}
            style={{ display: 'none' }}
          />
        </div>
        {state.prefs.lastExportAt ? (
          <p className="settings-meta">Last exported: {state.prefs.lastExportAt.slice(0, 10)}</p>
        ) : null}
      </section>
      */}
    </section>
  );
}
