// ── Register backup (full JSON export) ─────────────────────────────────────
// One-click safety net: downloads every register/CMS table as a JSON file with
// metadata, so the whole system state can be preserved (and re-imported via
// the Supabase dashboard if needed).
import { supabase } from '../supabase/client';

const BACKUP_TABLES = [
  'employees',
  'stations',
  'cadres',
  'centres',
  'facilitators',
  'centre_facilitators',
  'lga_area_officers',
  'partner_organisations',
  'organisation_members',
  'programmes',
  'cohorts',
  'learners',
  'lgas',
  'departments',
  'centre_organisations',
  'programme_lgas',
  'organisation_lga_coverage',
  'board_assets',
  'correspondence',
  'form_templates',
  'form_assignments',
  'form_submissions',
  'enrolment_stats',
  'cms_programs',
  'cms_news',
  'cms_team',
  'cms_gallery',
  'cms_downloads',
  'site_content',
  'cms_contacts',
] as const;

export interface BackupFile {
  app: 'ameb-ems-react';
  version: 1;
  exportedAt: string;
  exportedBy: string | null;
  tables: Record<string, unknown[] | null>;
}

/**
 * Fetch every table. Each table is fetched independently so one missing table
 * (e.g. a not-yet-run setup script) doesn't abort the whole backup — the row
 * set for that table is simply null.
 */
export async function fetchFullBackup(): Promise<BackupFile> {
  const session = await supabase.auth.getSession();
  const exportedBy = session.data.session?.user?.email ?? null;

  const results = await Promise.all(
    BACKUP_TABLES.map(async table => {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (error) return { table, rows: null };
        return { table, rows: data as unknown[] };
      } catch {
        return { table, rows: null };
      }
    })
  );

  const tables: Record<string, unknown[] | null> = {};
  for (const { table, rows } of results) tables[table] = rows;

  return {
    app: 'ameb-ems-react',
    version: 1,
    exportedAt: new Date().toISOString(),
    exportedBy,
    tables,
  };
}

/** Trigger a browser download of the backup as a JSON file. */
export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AMEB_backup_${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
