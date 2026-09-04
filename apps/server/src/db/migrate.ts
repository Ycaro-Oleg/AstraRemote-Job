import { sqlite } from "./client.ts";

export function migrate() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      linkedin_url TEXT NOT NULL DEFAULT '',
      github_url TEXT NOT NULL DEFAULT '',
      website_url TEXT NOT NULL DEFAULT '',
      current_title TEXT NOT NULL DEFAULT '',
      current_company TEXT NOT NULL DEFAULT '',
      years_experience INTEGER NOT NULL DEFAULT 0,
      years_ruby INTEGER NOT NULL DEFAULT 0,
      years_rails INTEGER NOT NULL DEFAULT 0,
      notice_period_days INTEGER,
      salary_target TEXT NOT NULL DEFAULT '',
      based_in TEXT NOT NULL DEFAULT 'BR',
      needs_us_sponsorship INTEGER NOT NULL DEFAULT 1,
      available_as TEXT NOT NULL DEFAULT '[]',
      skills TEXT NOT NULL DEFAULT '[]',
      target_titles TEXT NOT NULL DEFAULT '[]',
      target_keywords TEXT NOT NULL DEFAULT '[]',
      answers TEXT NOT NULL DEFAULT '{}',
      resume TEXT NOT NULL DEFAULT '{}',
      resume_pdf_path TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS company_boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ats TEXT NOT NULL,
      slug TEXT NOT NULL,
      kind TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      location_hint TEXT NOT NULL DEFAULT '',
      last_fetched_at TEXT,
      last_error TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS boards_ats_slug ON company_boards (ats, slug);

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_board_id INTEGER NOT NULL,
      external_id TEXT NOT NULL,
      ats TEXT NOT NULL,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      remote INTEGER NOT NULL DEFAULT 0,
      url TEXT NOT NULL,
      apply_url TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      posted_at TEXT,
      region TEXT NOT NULL DEFAULT 'other',
      hiring_geo TEXT NOT NULL DEFAULT 'unknown',
      role_fit TEXT NOT NULL DEFAULT 'no',
      score REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      queued_on TEXT,
      cover_letter TEXT,
      why_this_company TEXT,
      tailored_resume_json TEXT,
      tailored_resume_pdf_path TEXT,
      applied_at TEXT,
      notes TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS jobs_board_external ON jobs (company_board_id, external_id);
  `);
}
