import { braveSearch, delay } from './search.js';
import { firecrawlSearch, mapJobBoard, scrapeJobPost } from './scraper.js';
import { matchJobToResume } from './ai.js';
import {
  saveJob, isJobSaved, saveResume, updateResumeProfile,
  getActiveResume, saveSearchQueries,
  createSearchRun, completeSearchRun, setConfig, getActiveModel, getConfig,
  type ResumeProfile,
} from '../db/database.js';
import db from '../db/database.js';
import crypto from 'crypto';
import fs from 'fs';

export interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  url: string;
  description: string;
  match_score: number;
  analysis: string;
  matched_skills: string[];
  source: string;
}

export type SearchLogCallback = (msg: string) => void;

function generateId(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
}

// ═══════════════════════════════════════════
// STEP 1: Analyze resume with GLM-4
// ═══════════════════════════════════════════

async function analyzeAndStoreResume(
  resumeContent: string,
  resumePath: string,
  onLog: SearchLogCallback,
): Promise<{ resumeId: number; profile: ResumeProfile }> {
  const activeModel = getActiveModel();
  const modelName = activeModel ? activeModel.name : 'AI';
  
  onLog(`\n✅ Verified resume loaded: ${resumePath.split('/').pop()} (${resumeContent.length} bytes)`);
  onLog(`🧠 Analyzing resume with ${modelName}...`);

  const { analyzeResume } = await import('./ai.js');
  const profile = await analyzeResume(resumeContent);

  // Save resume to DB
  let resumeId = saveResume(resumePath, resumeContent);
  updateResumeProfile(resumeId, profile);
  setConfig('active_resume_id', String(resumeId));

  // Display profile
  onLog(`\n  📋 Profile extracted:`);
  onLog(`  🎯 Roles: ${profile.roles.join(', ')}`);
  onLog(`  📊 Level: ${profile.experience_level}`);
  onLog(`  🛠️  Tech: ${profile.tech_stack.join(', ')}`);
  onLog(`  📍 Locations: ${profile.preferred_locations.join(', ')}`);
  onLog(`  💡 Skills: ${profile.skills.slice(0, 10).join(', ')}${profile.skills.length > 10 ? '...' : ''}`);
  onLog(`  📝 ${profile.summary.slice(0, 100)}`);

  return { resumeId, profile };
}

// ═══════════════════════════════════════════
// STEP 2: Generate AI search queries
// ═══════════════════════════════════════════

async function generateAndStoreQueries(
  resumeId: number,
  profile: ResumeProfile,
  onLog: SearchLogCallback,
): Promise<any[]> {
  onLog(`\n🔍 Generating search queries from profile...`);

  const targetLoc = getConfig('target_location');
  if (targetLoc) {
    onLog(`  📍 User target location: ${targetLoc}`);
  }

  const { generateSearchQueries } = await import('./ai.js');
  const queries = await generateSearchQueries(profile, targetLoc);

  if (queries.length === 0) {
    onLog(`  ⚠️  No queries generated. Using fallback.`);
    return getDefaultQueries();
  }

  // Store in DB
  saveSearchQueries(resumeId, queries);

  onLog(`  ✅ Generated ${queries.length} targeted queries`);
  for (const q of queries.slice(0, 6)) {
    onLog(`  → [${q.engine}] ${q.source_filter}: "${q.query.slice(0, 60)}..."`);
  }
  if (queries.length > 6) {
    onLog(`  → ... and ${queries.length - 6} more`);
  }

  return queries;
}

// ═══════════════════════════════════════════
// STEP 3: Discover URLs using generated queries
// ═══════════════════════════════════════════

async function discoverUrlsFromQueries(
  queries: any[],
  onLog: SearchLogCallback,
): Promise<{ url: string; title: string; source: string; query: string }[]> {
  const allUrls: { url: string; title: string; source: string; query: string }[] = [];
  const seen = new Set<string>();

  function addUrl(url: string, title: string, source: string, query: string) {
    if (!seen.has(url) && !isJobSaved(url)) {
      seen.add(url);
      allUrls.push({ url, title, source, query });
    }
  }

  for (const q of queries) {
    try {
      if (q.engine === 'firecrawl') {
        onLog(`  🔥 Firecrawl: "${q.query.slice(0, 55)}..."`);
        const results = await firecrawlSearch(q.query, 5);
        for (const r of results) {
          addUrl(r.url, r.title, r.source || q.source_filter, q.query);
        }
        onLog(`     → ${results.length} results`);
        await delay(1500);
      } else if (q.engine === 'brave') {
        onLog(`  🔎 Brave: "${q.query.slice(0, 55)}..."`);
        const results = await braveSearch(q.query, 5);
        let added = 0;
        for (const r of results) {
          const isJobUrl = /job|career|position|vacanc|role|hiring|viewjob|apply/i.test(r.url);
          if (isJobUrl) {
            const src = r.url.includes('seek') ? 'Seek' : r.url.includes('indeed') ? 'Indeed' : r.url.includes('linkedin') ? 'LinkedIn' : q.source_filter;
            addUrl(r.url, r.title, src, q.query);
            added++;
          }
        }
        onLog(`     → ${added} job URLs from ${results.length} results`);
        await delay(2500);
      }
    } catch (err: any) {
      onLog(`  ⚠️  ${err.message?.slice(0, 60)}`);
    }
  }

  return allUrls;
}

// ═══════════════════════════════════════════
// STEP 4: Scrape + Match + Save
// ═══════════════════════════════════════════

async function scrapeAndMatch(
  urls: { url: string; title: string; source: string; query: string }[],
  resumeContent: string,
  onLog: SearchLogCallback,
  maxScrapes: number = 15,
): Promise<{ results: JobResult[]; stats: { scraped: number; saved: number; high: number } }> {
  const results: JobResult[] = [];
  let stats = { scraped: 0, saved: 0, high: 0 };

  const toScrape = urls.slice(0, maxScrapes);

  for (let i = 0; i < toScrape.length; i++) {
    const { url, title, source, query } = toScrape[i];

    onLog(`\n  [${i + 1}/${toScrape.length}] ${source} | ${(title || url).slice(0, 55)}`);

    try {
      const scraped = await scrapeJobPost(url);

      if (!scraped || scraped.description.length < 100) {
        onLog(`     ⏭️  Skipped — ${scraped ? 'insufficient content' : 'scrape failed'}`);
        continue;
      }

      stats.scraped++;

      onLog(`     📝 ${scraped.title.slice(0, 55)}`);
      if (scraped.company !== 'Unknown') onLog(`     🏢 ${scraped.company}`);
      if (scraped.location !== 'Not specified') onLog(`     📍 ${scraped.location}`);
      if (scraped.salary !== 'Not specified') onLog(`     💰 ${scraped.salary}`);

      // Match with AI
      const activeModel = getActiveModel();
      const modelName = activeModel ? activeModel.name : 'AI';
      onLog(`     🤖 Matching with ${modelName}...`);
      const descForMatch = scraped.description.slice(0, 3000);
      const match = await matchJobToResume(resumeContent, descForMatch);

      const emoji = match.score >= 70 ? '🟢' : match.score >= 40 ? '🟡' : '🔴';
      onLog(`     ${emoji} ${match.score}% — ${match.analysis.slice(0, 70)}`);
      if (match.matched_skills.length > 0) {
        onLog(`     ✨ Matched: ${match.matched_skills.join(', ')}`);
      }

      // Save
      const jobId = generateId(url);
      const saved = saveJob({
        id: jobId,
        title: scraped.title,
        company: scraped.company,
        location: scraped.location,
        salary: scraped.salary,
        url,
        raw_description: scraped.description,
        match_score: match.score,
        analysis: match.analysis,
        matched_skills: match.matched_skills.join(', '),
        source,
        discovered_by_query: query,
      });

      if (saved) {
        stats.saved++;
        if (match.score >= 70) stats.high++;
        results.push({
          id: jobId,
          title: scraped.title,
          company: scraped.company,
          location: scraped.location,
          salary: scraped.salary,
          url,
          description: scraped.description,
          match_score: match.score,
          analysis: match.analysis,
          matched_skills: match.matched_skills,
          source,
        });
      }

      await delay(1500);
    } catch (err: any) {
      onLog(`     ❌ ${err.message?.slice(0, 70)}`);
    }
  }

  return { results, stats };
}

// ═══════════════════════════════════════════
// FALLBACK QUERIES
// ═══════════════════════════════════════════

function getDefaultQueries(): any[] {
  return [
    { query: 'site:linkedin.com/jobs/view software engineer australia', engine: 'firecrawl', source_filter: 'LinkedIn' },
    { query: 'site:linkedin.com/jobs/view developer remote', engine: 'firecrawl', source_filter: 'LinkedIn' },
    { query: 'software engineer jobs hiring australia 2025', engine: 'brave', source_filter: 'Any' },
    { query: 'developer job opening remote australia', engine: 'brave', source_filter: 'Any' },
    { query: 'site:seek.com.au software engineer', engine: 'firecrawl', source_filter: 'Seek' },
  ];
}

// ═══════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════

export async function runFullPipeline(
  resumeContent: string,
  resumePath: string,
  onLog: SearchLogCallback,
  maxScrapes: number = 15,
): Promise<JobResult[]> {
  const sep = '━'.repeat(40);

  onLog(`\n${sep}`);
  onLog(`  JACK HUNT — Pipeline Started`);
  onLog(`  ${new Date().toLocaleString()}`);
  onLog(`${sep}`);
  onLog(`📄 Resume: ${resumeContent.length} chars from ${resumePath}`);

  // Validate resume content
  if (!resumeContent || resumeContent.trim().length === 0) {
    onLog(`❌ Resume is empty (0 chars). Cannot proceed.`);
    onLog(`💡 Load a .md, .txt, or text-based .pdf file.`);
    return [];
  }

  onLog(`📄 Resume: ${resumeContent.length} chars from ${resumePath}`);

  try {
    // Step 1: Analyze resume and save to DB
    const { resumeId, profile } = await analyzeAndStoreResume(resumeContent, resumePath, onLog);

    // Now create the search run with a valid resume_id
    const searchId = createSearchRun(resumeId);

    // Step 2: Generate queries
    const queries = await generateAndStoreQueries(resumeId, profile, onLog);

    // Step 3: Discover URLs
    onLog(`\n🌐 Discovering job URLs...`);
    const discovered = await discoverUrlsFromQueries(queries, onLog);
    onLog(`\n📊 Found ${discovered.length} unique new URLs`);

    if (discovered.length === 0) {
      onLog(`⚠️  No URLs found. Try again later.`);
      completeSearchRun(searchId, { urls_discovered: 0, urls_scraped: 0, jobs_saved: 0, high_matches: 0 });
      return [];
    }

    // Step 4: Scrape + Match + Save
    onLog(`\n🗓️  Scraping up to ${maxScrapes} jobs...`);
    const { results, stats } = await scrapeAndMatch(discovered, resumeContent, onLog, maxScrapes);

    // Complete search run
    completeSearchRun(searchId, {
      urls_discovered: discovered.length,
      urls_scraped: stats.scraped,
      jobs_saved: stats.saved,
      high_matches: stats.high,
    });

    // Summary
    onLog(`\n${sep}`);
    onLog(`  📊 RESULTS`);
    onLog(`${sep}`);
    onLog(`  URLs discovered:  ${discovered.length}`);
    onLog(`  Pages scraped:   ${stats.scraped}`);
    onLog(`  Jobs saved:      ${stats.saved}`);
    onLog(`  🟢 High (≥70%):  ${stats.high}`);
    onLog(`  🟡 Medium:        ${results.filter(j => j.match_score >= 40 && j.match_score < 70).length}`);
    onLog(`  🔴 Low:           ${results.filter(j => j.match_score < 40).length}`);
    onLog(`${sep}`);

    return results;
  } catch (err: any) {
    onLog(`\n❌ Pipeline failed: ${err.message}`);
    return [];
  }
}
