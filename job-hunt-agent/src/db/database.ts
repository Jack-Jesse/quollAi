import Database from 'better-sqlite3';

const db = new Database('jobs.db');

// Enable WAL mode for better concurrent reads
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    -- ═══════════════════════════════════════════
    -- RESUMES — stores loaded resumes + AI profile
    -- ═══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT UNIQUE NOT NULL,
      raw_content TEXT NOT NULL,
      -- AI-extracted profile (JSON string)
      profile_json TEXT,
      -- Individual fields parsed from profile_json for easy querying
      skills TEXT,
      roles TEXT,
      experience_level TEXT,
      preferred_locations TEXT,
      tech_stack TEXT,
      summary TEXT,
      analyzed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════════════════════════════
    -- SEARCH QUERIES — AI-generated from resume
    -- ═══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS search_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resume_id INTEGER REFERENCES resumes(id),
      query TEXT NOT NULL,
      engine TEXT NOT NULL,          -- 'firecrawl', 'brave', 'seek_map'
      source_filter TEXT,            -- 'Seek', 'LinkedIn', 'Indeed'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════════════════════════════
    -- JOBS — discovered + matched jobs
    -- ═══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT,
      company TEXT,
      location TEXT,
      salary TEXT,
      url TEXT UNIQUE,
      raw_description TEXT,
      -- AI analysis
      match_score INTEGER DEFAULT 0,
      analysis TEXT,
      matched_skills TEXT,           -- comma-separated skills that matched
      -- Status tracking
      status TEXT DEFAULT 'new',     -- 'new', 'interested', 'applied', 'rejected', 'archived'
      notes TEXT,
      source TEXT,                   -- 'Seek', 'Indeed', 'LinkedIn', 'Brave'
      discovered_by_query TEXT,
      -- Timestamps
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      applied_at DATETIME,
      archived_at DATETIME
    );

    -- ═══════════════════════════════════════════
    -- SEARCHES — track each pipeline run
    -- ═══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resume_id INTEGER REFERENCES resumes(id),
      status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
      urls_discovered INTEGER DEFAULT 0,
      urls_scraped INTEGER DEFAULT 0,
      jobs_saved INTEGER DEFAULT 0,
      high_matches INTEGER DEFAULT 0,
      error_message TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    -- ═══════════════════════════════════════════
    -- MODELS — configured LLM endpoints
    -- ═══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,        -- 'glm', 'ollama', 'openai', 'anthropic', 'custom'
      base_url TEXT NOT NULL,
      api_key TEXT DEFAULT '',
      model TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,   -- only one should be active at a time
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════════════════════════════
    -- CONFIG — app settings
    -- ═══════════════════════════════════════════
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ═══════════════════════════════════════════
    -- INDEXES — speed up common queries
    -- ═══════════════════════════════════════════
    CREATE INDEX IF NOT EXISTS idx_jobs_match_score ON jobs(match_score DESC);
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
    CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_searches_resume ON searches(resume_id);
    CREATE INDEX IF NOT EXISTS idx_search_queries_resume ON search_queries(resume_id);
  `);
}

// ─────────────────────────────────────────────
// Resume helpers
// ─────────────────────────────────────────────

export function saveResume(filePath: string, rawContent: string): number {
  return db.prepare(`
    INSERT OR REPLACE INTO resumes (file_path, raw_content)
    VALUES (?, ?)
  `).run(filePath, rawContent).lastInsertRowid as number;
}

export function updateResumeProfile(resumeId: number, profile: ResumeProfile) {
  db.prepare(`
    UPDATE resumes SET
      profile_json = ?,
      skills = ?,
      roles = ?,
      experience_level = ?,
      preferred_locations = ?,
      tech_stack = ?,
      summary = ?,
      analyzed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    JSON.stringify(profile),
    profile.skills.join(', '),
    profile.roles.join(', '),
    profile.experience_level,
    profile.preferred_locations.join(', '),
    profile.tech_stack.join(', '),
    profile.summary,
    resumeId,
  );
}

export function getActiveResume(): { id: number; file_path: string; raw_content: string; profile_json: string | null } | null {
  const config = db.prepare("SELECT value FROM config WHERE key = 'active_resume_id'").get() as any;
  if (!config) {
    // Try most recent resume
    const row = db.prepare('SELECT id, file_path, raw_content, profile_json FROM resumes ORDER BY id DESC LIMIT 1').get() as any;
    if (row) {
      db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('active_resume_id', ?)").run(String(row.id));
    }
    return row || null;
  }
  return db.prepare('SELECT id, file_path, raw_content, profile_json FROM resumes WHERE id = ?').get(config.value) as any || null;
}

export function getAllResumes() {
  return db.prepare('SELECT id, file_path, skills, roles, experience_level, analyzed_at, created_at FROM resumes ORDER BY id DESC').all();
}

// ─────────────────────────────────────────────
// Search query helpers
// ─────────────────────────────────────────────

export function saveSearchQueries(resumeId: number, queries: { query: string; engine: string; source_filter: string }[]) {
  const insert = db.prepare(`
    INSERT INTO search_queries (resume_id, query, engine, source_filter)
    VALUES (?, ?, ?, ?)
  `);
  const batch = db.transaction((qs: typeof queries) => {
    for (const q of qs) {
      insert.run(resumeId, q.query, q.engine, q.source_filter);
    }
  });
  batch(queries);
}

export function getSearchQueriesForResume(resumeId: number) {
  return db.prepare('SELECT * FROM search_queries WHERE resume_id = ? ORDER BY id').all(resumeId);
}

// ─────────────────────────────────────────────
// Job helpers
// ─────────────────────────────────────────────

export function saveJob(job: {
  id: string; title: string; company: string; location: string;
  salary: string; url: string; raw_description: string;
  match_score: number; analysis: string; matched_skills: string;
  source: string; discovered_by_query: string;
}): boolean {
  try {
    db.prepare(`
      INSERT OR IGNORE INTO jobs (id, title, company, location, salary, url, raw_description, match_score, analysis, matched_skills, source, discovered_by_query)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.id, job.title, job.company, job.location, job.salary,
      job.url, job.raw_description, job.match_score, job.analysis,
      job.matched_skills, job.source, job.discovered_by_query,
    );
    return true;
  } catch {
    return false;
  }
}

export function updateJobStatus(jobId: string, status: string) {
  const updateFields: Record<string, string> = { status, updated_at: 'CURRENT_TIMESTAMP' };
  if (status === 'applied') updateFields.applied_at = 'CURRENT_TIMESTAMP';
  if (status === 'archived') updateFields.archived_at = 'CURRENT_TIMESTAMP';

  const fields = Object.entries(updateFields).map(([k, v]) => `${k} = ${v}`).join(', ');
  db.prepare(`UPDATE jobs SET ${fields} WHERE id = ?`).run(jobId);
}

export function updateJobNotes(jobId: string, notes: string) {
  db.prepare("UPDATE jobs SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(notes, jobId);
}

export function getJobs(filter: { status?: string; minScore?: number; source?: string } = {}) {
  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params: any[] = [];

  if (filter.status) { sql += ' AND status = ?'; params.push(filter.status); }
  if (filter.minScore) { sql += ' AND match_score >= ?'; params.push(filter.minScore); }
  if (filter.source) { sql += ' AND source = ?'; params.push(filter.source); }

  sql += ' ORDER BY match_score DESC, created_at DESC LIMIT 50';
  return db.prepare(sql).all(...params);
}

export function getJobCount(filter: { status?: string; minScore?: number } = {}) {
  let sql = 'SELECT COUNT(*) as count FROM jobs WHERE 1=1';
  const params: any[] = [];

  if (filter.status) { sql += ' AND status = ?'; params.push(filter.status); }
  if (filter.minScore) { sql += ' AND match_score >= ?'; params.push(filter.minScore); }

  return (db.prepare(sql).get(...params) as any)?.count || 0;
}

export function isJobSaved(url: string): boolean {
  return !!db.prepare('SELECT id FROM jobs WHERE url = ?').get(url);
}

// ─────────────────────────────────────────────
// Search run helpers
// ─────────────────────────────────────────────

export function createSearchRun(resumeId: number): number {
  return db.prepare(`
    INSERT INTO searches (resume_id, status) VALUES (?, 'running')
  `).run(resumeId).lastInsertRowid as number;
}

export function completeSearchRun(searchId: number, stats: { urls_discovered: number; urls_scraped: number; jobs_saved: number; high_matches: number; error_message?: string }) {
  db.prepare(`
    UPDATE searches SET
      status = 'completed',
      urls_discovered = ?,
      urls_scraped = ?,
      jobs_saved = ?,
      high_matches = ?,
      error_message = ?,
      completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(stats.urls_discovered, stats.urls_scraped, stats.jobs_saved, stats.high_matches, stats.error_message || null, searchId);
}

export function getSearchHistory(limit: number = 10) {
  return db.prepare(`
    SELECT s.*, r.file_path as resume_file
    FROM searches s
    LEFT JOIN resumes r ON s.resume_id = r.id
    ORDER BY s.id DESC LIMIT ?
  `).all(limit);
}

// ─────────────────────────────────────────────
// Config helpers
// ─────────────────────────────────────────────

export function getConfig(key: string): string | null {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as any;
  return row?.value || null;
}

export function setConfig(key: string, value: string) {
  db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)").run(key, value);
}

// ─────────────────────────────────────────────
// Model helpers
// ─────────────────────────────────────────────

export function getAllModels(): ModelConfig[] {
  return db.prepare('SELECT * FROM models ORDER BY id').all() as ModelConfig[];
}

export function getActiveModel(): ModelConfig | null {
  return db.prepare('SELECT * FROM models WHERE is_active = 1 LIMIT 1').get() as ModelConfig || null;
}

export function addModel(name: string, provider: string, base_url: string, api_key: string, model: string): number {
  const id = db.prepare(`
    INSERT INTO models (name, provider, base_url, api_key, model)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, provider, base_url, api_key, model).lastInsertRowid as number;
  return id;
}

export function setActiveModel(modelId: number) {
  // Deactivate all, then activate the chosen one
  db.prepare('UPDATE models SET is_active = 0').run();
  db.prepare('UPDATE models SET is_active = 1 WHERE id = ?').run(modelId);
}

export function deleteModel(modelId: number) {
  db.prepare('DELETE FROM models WHERE id = ? AND is_active = 0').run(modelId);
}

export function updateModel(modelId: number, fields: Partial<ModelConfig>) {
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && k !== 'id') {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
  }
  if (sets.length === 0) return;
  vals.push(modelId);
  db.prepare(`UPDATE models SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

// Seed default models if none exist
export function seedDefaultModels() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM models').get() as any)?.c;
  if (count && count > 0) return;

  const glmKey = process.env.GLM_API_KEY || '';
  const glmUrl = 'https://api.z.ai/api/coding/paas/v4';

  db.transaction(() => {
    // ── Z.AI / GLM models (live from api.z.ai) ──
    const glmModels = [
      { name: 'GLM-5.1',       model: 'glm-5.1' },
      { name: 'GLM-5-Turbo',   model: 'glm-5-turbo' },
      { name: 'GLM-5',         model: 'glm-5' },
      { name: 'GLM-4.7',       model: 'glm-4.7' },
      { name: 'GLM-4.6',       model: 'glm-4.6' },
      { name: 'GLM-4.5',       model: 'glm-4.5' },
      { name: 'GLM-4.5-Flash', model: 'glm-4.5-flash' },
      { name: 'GLM-4.5-Air',   model: 'glm-4.5-air' },
    ];

    glmModels.forEach((m, i) => {
      db.prepare(`
        INSERT INTO models (name, provider, base_url, api_key, model, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(m.name, 'glm', glmUrl, glmKey, m.model, i === 0 ? 1 : 0);
    });

    // ── Ollama local models ──
    const ollamaModels = [
      { name: 'Ollama Llama3',       model: 'llama3' },
      { name: 'Ollama Llama3.1',     model: 'llama3.1' },
      { name: 'Ollama Mistral',      model: 'mistral' },
      { name: 'Ollama Qwen2.5',      model: 'qwen2.5' },
      { name: 'Ollama DeepSeek-R1', model: 'deepseek-r1' },
      { name: 'Ollama Codellama',   model: 'codellama' },
      { name: 'Ollama Phi3',        model: 'phi3' },
      { name: 'Ollama Gemma2',      model: 'gemma2' },
    ];

    ollamaModels.forEach((m) => {
      db.prepare(`
        INSERT INTO models (name, provider, base_url, api_key, model, is_active)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(m.name, 'ollama', 'http://localhost:11434/v1', '', m.model);
    });

    // ── OpenAI ──
    const openaiModels = [
      { name: 'OpenAI GPT-4o',      model: 'gpt-4o' },
      { name: 'OpenAI GPT-4o-mini',  model: 'gpt-4o-mini' },
      { name: 'OpenAI GPT-4-turbo', model: 'gpt-4-turbo' },
      { name: 'OpenAI o3-mini',     model: 'o3-mini' },
    ];

    openaiModels.forEach((m) => {
      db.prepare(`
        INSERT INTO models (name, provider, base_url, api_key, model, is_active)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(m.name, 'openai', 'https://api.openai.com/v1', '', m.model);
    });
  })();
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ResumeProfile {
  skills: string[];
  roles: string[];
  experience_level: string;
  preferred_locations: string[];
  tech_stack: string[];
  summary: string;
}

export interface ModelConfig {
  id: number;
  name: string;
  provider: string;
  base_url: string;
  api_key: string;
  model: string;
  is_active: number;
}

export default db;
