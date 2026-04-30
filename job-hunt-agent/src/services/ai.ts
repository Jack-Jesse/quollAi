import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getActiveModel, seedDefaultModels, type ModelConfig } from '../db/database.js';

dotenv.config();

// Seed defaults on first load
seedDefaultModels();

// ═══════════════════════════════════════════
// Dynamic LLM Client — reads from DB
// ═══════════════════════════════════════════

function getClient(): { client: OpenAI; model: string } {
  const cfg = getActiveModel();
  if (!cfg) {
    throw new Error('No active model configured. Go to Settings → Models to add one.');
  }
  const client = new OpenAI({
    apiKey: cfg.api_key || 'not-needed',
    baseURL: cfg.base_url,
  });
  return { client, model: cfg.model };
}

// ═══════════════════════════════════════════
// 1. RESUME ANALYSIS
// ═══════════════════════════════════════════

export async function analyzeResume(resumeContent: string): Promise<import('../db/database.js').ResumeProfile> {
  const { client, model } = getClient();
  const cfg = getActiveModel();

  const prompt = `You are an expert career analyst and technical recruiter. Analyze the following resume thoroughly and extract structured information.

RESUME:
${resumeContent}

Return ONLY a JSON object with these exact fields:
{
  "skills": ["skill1", "skill2", ...],
  "roles": ["Job Title 1", "Job Title 2", ...],
  "experience_level": "junior|mid|senior|lead|principal",
  "preferred_locations": ["City, Country", ...],
  "tech_stack": ["Technology1", "Technology2", ...],
  "summary": "2-3 sentence professional summary of the candidate"
}

Rules:
- skills: all technical and soft skills mentioned (min 5, max 20)
- roles: specific job titles this person is qualified for (min 3, max 8)
- experience_level: based on years of experience and seniority
- preferred_locations: cities/regions mentioned or implied by current location
- tech_stack: programming languages, frameworks, tools, platforms
- summary: write it as if recommending this candidate to a hiring manager`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a JSON-only response machine. Output valid JSON only. No markdown, no explanation.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    });

    const raw = response.choices[0]?.message?.content || '{}';
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const profile = JSON.parse(clean);

    return {
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      roles: Array.isArray(profile.roles) ? profile.roles : [],
      experience_level: profile.experience_level || 'mid',
      preferred_locations: Array.isArray(profile.preferred_locations) ? profile.preferred_locations : [],
      tech_stack: Array.isArray(profile.tech_stack) ? profile.tech_stack : [],
      summary: profile.summary || '',
    };
  } catch (error: any) {
    console.error(`Error analyzing resume [${cfg?.name}]:`, error.message);
    return {
      skills: ['unknown'],
      roles: ['unknown'],
      experience_level: 'mid',
      preferred_locations: ['Remote'],
      tech_stack: ['unknown'],
      summary: `Failed to analyze resume. Model: ${cfg?.name || 'none'}. Error: ${error.message}`,
    };
  }
}

// ═══════════════════════════════════════════
// 2. SEARCH QUERY GENERATION
// ═══════════════════════════════════════════

interface GeneratedQuery {
  query: string;
  engine: 'firecrawl' | 'brave';
  source_filter: string;
}

export async function generateSearchQueries(
  profile: import('../db/database.js').ResumeProfile,
  targetLocation?: string | null,
): Promise<GeneratedQuery[]> {
  const { client, model } = getClient();

  const locationsStr = targetLocation ? targetLocation : profile.preferred_locations.join(', ');

  const prompt = `You are a job search expert. Based on this candidate profile, generate highly targeted search queries to find relevant job postings on Seek, Indeed, and LinkedIn.

CANDIDATE PROFILE:
- Skills: ${profile.skills.join(', ')}
- Target Roles: ${profile.roles.join(', ')}
- Experience Level: ${profile.experience_level}
- Tech Stack: ${profile.tech_stack.join(', ')}
- Target Location: ${locationsStr}

Generate a JSON array of search query objects. Each object has:
- "query": the actual search string
- "engine": "firecrawl" or "brave"
- "source_filter": "Seek", "Indeed", "LinkedIn", or "Any"

Rules:
- Generate 8-12 queries total
- Mix between Firecrawl (use "site:linkedin.com/jobs/view" and "site:seek.com.au" operators) and Brave Search
- Vary queries: combine skills, roles, locations in different ways
- Use "site:" operators for Firecrawl queries targeting LinkedIn/Seek
- Use natural language for Brave queries
- Include at least 2 queries targeting remote/hybrid work
- Include queries for each of the candidate's target roles
- Include queries combining 2-3 specific skills from their tech stack

Return ONLY the JSON array. No markdown.`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a JSON-only response machine. Output valid JSON only. No markdown, no explanation.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });

    const raw = response.choices[0]?.message?.content || '[]';
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const queries = JSON.parse(clean);

    if (!Array.isArray(queries)) return [];

    return queries.map((q: any) => ({
      query: String(q.query || ''),
      engine: q.engine === 'brave' ? 'brave' as const : 'firecrawl' as const,
      source_filter: String(q.source_filter || 'Any'),
    })).filter((q: GeneratedQuery) => q.query.length > 3);
  } catch (error: any) {
    console.error('Error generating queries:', error.message);
    return [];
  }
}

// ═══════════════════════════════════════════
// 3. JOB MATCHING
// ═══════════════════════════════════════════

export async function matchJobToResume(
  resumeContent: string,
  jobDescription: string,
): Promise<{ score: number; analysis: string; matched_skills: string[] }> {
  const { client, model } = getClient();

  const prompt = `You are an expert technical recruiter evaluating how well a candidate matches a job posting.

CANDIDATE RESUME:
${resumeContent}

JOB DESCRIPTION:
${jobDescription}

Evaluate the match and return ONLY this JSON object:
{
  "score": <number 0-100>,
  "analysis": "<2-sentence explanation of fit>",
  "matched_skills": ["skill1", "skill2", ...]
}

Scoring guide:
- 90-100: Perfect match — all key skills align, right experience level
- 70-89: Strong match — most skills align, good experience fit
- 50-69: Moderate match — some skills overlap, worth considering
- 30-49: Weak match — few skills align
- 0-29: No match — wrong role, wrong level, wrong stack

For matched_skills: list only skills from the resume that are relevant to this job (max 8).`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a JSON-only response machine. Output valid JSON only. No markdown, no explanation.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.05,
    });

    const raw = response.choices[0]?.message?.content || '{}';
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(clean);

    return {
      score: Math.min(100, Math.max(0, Number(result.score) || 0)),
      analysis: String(result.analysis || ''),
      matched_skills: Array.isArray(result.matched_skills) ? result.matched_skills : [],
    };
  } catch (error: any) {
    console.error('Error matching job:', error.message);
    return { score: 0, analysis: 'Failed to analyze.', matched_skills: [] };
  }
}

// ═══════════════════════════════════════════
// Utility: list available models from a provider
// ═══════════════════════════════════════════

export interface RemoteModel {
  id: string;
  name: string;
}

export async function browseModels(modelCfg: ModelConfig): Promise<{ models: RemoteModel[]; error: string | null }> {
  try {
    const client = new OpenAI({
      apiKey: modelCfg.api_key || 'not-needed',
      baseURL: modelCfg.base_url,
    });
    const response = await client.models.list();
    const models: RemoteModel[] = [];
    for await (const m of response) {
      models.push({
        id: m.id,
        name: m.id.replace(/^models\//, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      });
    }
    return { models, error: null };
  } catch (error: any) {
    return { models: [], error: error.message };
  }
}

// Utility: test a model connection
// ═══════════════════════════════════════════

export async function testModel(modelCfg: ModelConfig): Promise<{ ok: boolean; message: string; latency: number }> {
  try {
    const client = new OpenAI({
      apiKey: modelCfg.api_key || 'not-needed',
      baseURL: modelCfg.base_url,
    });
    const start = Date.now();
    const response = await client.chat.completions.create({
      model: modelCfg.model,
      messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
      temperature: 0,
      max_tokens: 5,
    });
    const latency = Date.now() - start;
    const reply = response.choices[0]?.message?.content || '';
    return { ok: true, message: `✅ "${reply.trim()}" (${latency}ms)`, latency };
  } catch (error: any) {
    return { ok: false, message: `❌ ${error.message}`, latency: 0 };
  }
}
