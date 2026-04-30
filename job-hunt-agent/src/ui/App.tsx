import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import db, {
  getAllModels, getActiveModel, addModel, setActiveModel,
  deleteModel, updateModel, seedDefaultModels,
  type ModelConfig,
} from '../db/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bannerText = fs.readFileSync(path.join(__dirname, 'banner.txt'), 'utf-8');

type Screen =
  | 'menu'
  | 'inputPath'
  | 'searching'
  | 'results'
  | 'models'
  | 'addModel'
  | 'editModel'
  | 'browseRemote';

type ModelField = 'name' | 'provider' | 'base_url' | 'api_key' | 'model';

// ═══════════════════════════════════════════════
// Provider metadata
// ═══════════════════════════════════════════════
const PROVIDERS = ['glm', 'ollama', 'openai', 'anthropic', 'custom'] as const;

const PROVIDER_META: Record<string, { label: string; color: string; defaultUrl: string; defaultModel: string }> = {
  glm:       { label: 'GLM',       color: 'cyan',   defaultUrl: 'https://api.z.ai/api/coding/paas/v4', defaultModel: 'glm-5.1' },
  ollama:    { label: 'OLLAMA',    color: 'green',  defaultUrl: 'http://localhost:11434/v1',           defaultModel: 'llama3' },
  openai:    { label: 'OPENAI',    color: 'blue',   defaultUrl: 'https://api.openai.com/v1',           defaultModel: 'gpt-4o' },
  anthropic: { label: 'ANTHROPIC', color: 'yellow', defaultUrl: 'https://api.anthropic.com/v1',        defaultModel: 'claude-3.5-sonnet' },
  custom:    { label: 'CUSTOM',    color: 'gray',   defaultUrl: '',                                   defaultModel: '' },
};

// ═══════════════════════════════════════════════
// Display row types for model list
// ═══════════════════════════════════════════════
interface HeaderRow { type: 'header'; provider: string; count: number }
interface ModelRow  { type: 'model';  model: ModelConfig; flatIndex: number }
type DisplayRow = HeaderRow | ModelRow;

export default function App() {
  const { stdout } = useStdout();
  const [screen, setScreen] = useState<Screen>('menu');
  const [menuIndex, setMenuIndex] = useState(0);
  const [resumePath, setResumePath] = useState<string>('');
  const [resumeLoaded, setResumeLoaded] = useState<boolean>(false);
  const [resumeContent, setResumeContent] = useState<string>('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchLog, setSearchLog] = useState<string[]>([]);
  const [inputBuffer, setInputBuffer] = useState<string>('');

  // Models state
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [modelIndex, setModelIndex] = useState(0);
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const [editingModel, setEditingModel] = useState<ModelConfig | null>(null);
  const [editField, setEditField] = useState<ModelField>('name');
  const [editBuffer, setEditBuffer] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [testResult, setTestResult] = useState<{ modelId: number; ok: boolean; msg: string } | null>(null);
  // Remote browse state
  const [remoteModels, setRemoteModels] = useState<{ id: string; name: string }[]>([]);
  const [remoteIndex, setRemoteIndex] = useState(0);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string>('');
  const [browseSource, setBrowseSource] = useState<ModelConfig | null>(null);

  const termWidth = stdout?.columns || 80;
  const termHeight = stdout?.rows || 24;

  const menuItems = [
    { label: '📄  Load Resume (PDF / MD)', screen: 'inputPath' as Screen },
    { label: '🔍  Start Job Search', screen: 'searching' as Screen },
    { label: '📋  View Saved Jobs', screen: 'results' as Screen },
    { label: '⚙️  Models & Settings', screen: 'models' as Screen },
    { label: '🚪  Exit', screen: 'menu' as Screen },
  ];

  // Load on mount
  useEffect(() => {
    seedDefaultModels();
    loadModels();
    try {
      const row = db.prepare("SELECT value FROM config WHERE key = 'resume_path'").get() as any;
      if (row && row.value && fs.existsSync(row.value)) {
        const filePath = row.value;
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.md' || ext === '.txt') {
          setResumeContent(fs.readFileSync(filePath, 'utf-8'));
          setResumePath(filePath);
          setResumeLoaded(true);
        } else if (ext === '.pdf') {
          setResumePath(filePath);
          setResumeLoaded(true);
        }
      }
    } catch {}
    loadJobs();
  }, []);

  function loadJobs() {
    try {
      const rows = db.prepare('SELECT * FROM jobs ORDER BY match_score DESC, created_at DESC LIMIT 20').all();
      setJobs(rows as any[]);
    } catch {}
  }

  function loadModels() {
    try { setModels(getAllModels()); } catch {}
  }

  function addLog(msg: string) { setSearchLog(prev => [...prev, msg]); }

  function flash(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  }

  // ── URL shortener for display ──
  function shortUrl(url: string): string {
    try { return new URL(url).hostname.replace('api.', '').replace('open.', ''); } catch { return url.length > 24 ? url.slice(0, 24) + '…' : url; }
  }

  // ── PDF Parser ──

  async function parsePdfResume(filePath: string) {
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const buf = new Uint8Array(fs.readFileSync(filePath));
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      let fullText = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      if (fullText.trim().length === 0) {
        flash('⚠️  PDF is empty or image-based.');
        setResumeLoaded(false);
      } else {
        setResumeContent(fullText);
        setResumeLoaded(true);
        db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('resume_path', ?)").run(filePath);
        flash(`✅ PDF: ${fullText.length} chars, ${doc.numPages} pages`);
      }
    } catch (err: any) {
      flash(`❌ PDF error: ${err.message}`);
      setResumeLoaded(false);
    }
  }

  async function getResumeContent(): Promise<string> {
    if (resumeContent.length > 0) return resumeContent;
    if (resumePath && path.extname(resumePath).toLowerCase() === '.pdf') {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const buf = new Uint8Array(fs.readFileSync(resumePath));
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      let fullText = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      if (fullText.trim().length > 0) { setResumeContent(fullText); return fullText; }
    }
    return '';
  }

  // ═══════════════════════════════════════════════
  // Input Handler
  // ═══════════════════════════════════════════════

  useInput((input, key) => {

    // ── Global shortcuts ──
    if (input === '/' && screen === 'menu') { setScreen('models'); loadModels(); return; }

    // ── MENU ──
    if (screen === 'menu') {
      if (key.upArrow) setMenuIndex(i => (i - 1 + menuItems.length) % menuItems.length);
      if (key.downArrow) setMenuIndex(i => (i + 1) % menuItems.length);
      if (key.return) {
        const item = menuItems[menuIndex];
        if (item.label.includes('Exit')) process.exit(0);
        setScreen(item.screen);
        setSearchLog([]);
        if (item.screen === 'models') loadModels();
      }
    }

    // ── INPUT PATH (resume) ──
    if (screen === 'inputPath') {
      if (key.return) {
        const trimmed = inputBuffer.trim();
        if (fs.existsSync(trimmed)) {
          const ext = path.extname(trimmed).toLowerCase();
          if (ext === '.md' || ext === '.txt') {
            setResumeContent(fs.readFileSync(trimmed, 'utf-8'));
            setResumePath(trimmed);
            setResumeLoaded(true);
            db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('resume_path', ?)").run(trimmed);
            flash(`✅ Loaded: ${trimmed}`);
          } else if (ext === '.pdf') {
            setResumePath(trimmed);
            parsePdfResume(trimmed);
          } else {
            flash(`❌ Unsupported: ${ext}`);
          }
        } else {
          flash(`❌ Not found: ${trimmed}`);
        }
        setInputBuffer('');
        setScreen('menu');
      } else if (key.backspace || key.delete) {
        setInputBuffer(b => b.slice(0, -1));
      } else if (input && !key.escape) {
        setInputBuffer(b => b + input);
      }
    }

    // ── MODELS LIST ──
    if (screen === 'models') {
      if (key.escape) { setScreen('menu'); return; }

      const filtered = providerFilter ? models.filter(m => m.provider === providerFilter) : models;
      const maxIdx = Math.max(0, filtered.length - 1);

      // Arrow navigation
      if (key.upArrow) setModelIndex(i => Math.max(0, i - 1));
      if (key.downArrow) setModelIndex(i => Math.min(maxIdx, i + 1));
      if (key.pageUp) setModelIndex(i => Math.max(0, i - 8));
      if (key.pageDown) setModelIndex(i => Math.min(maxIdx, i + 8));
      if (key.home) setModelIndex(0);
      if (key.end) setModelIndex(maxIdx);

      // Provider filter: 1=all, 2-6=provider
      if (input >= '1' && input <= '6') {
        const newFilter = input === '1' ? null : PROVIDERS[parseInt(input) - 2];
        setProviderFilter(newFilter);
        const active = models.find(m => m.is_active === 1);
        if (active) {
          const newFiltered = newFilter ? models.filter(m => m.provider === newFilter) : models;
          const idx = newFiltered.findIndex(m => m.id === active.id);
          setModelIndex(idx >= 0 ? idx : 0);
        } else {
          setModelIndex(0);
        }
        return;
      }

      // Enter = switch to selected model
      if (key.return && filtered[modelIndex]) {
        const m = filtered[modelIndex];
        setActiveModel(m.id);
        loadModels();
        flash(`✅ Switched to: ${m.name}`);
        return;
      }

      // a = add new model
      if (input === 'a' || input === 'n') {
        setEditingModel({
          id: 0, name: 'new-model', provider: 'glm',
          base_url: PROVIDER_META.glm.defaultUrl, api_key: '', model: PROVIDER_META.glm.defaultModel,
          is_active: 0,
        });
        setEditField('name');
        setEditBuffer('new-model');
        setScreen('addModel');
        return;
      }

      // e = edit selected model
      if (input === 'e' && filtered[modelIndex]) {
        const m = filtered[modelIndex];
        setEditingModel({ ...m });
        setEditField('name');
        setEditBuffer(m.name);
        setScreen('editModel');
        return;
      }

      // d = delete selected model (non-active only)
      if (input === 'd' && filtered[modelIndex] && filtered[modelIndex].is_active === 0) {
        const m = filtered[modelIndex];
        deleteModel(m.id);
        loadModels();
        setModelIndex(i => Math.min(i, maxIdx - 1));
        flash(`🗑️  Deleted: ${m.name}`);
        return;
      }

      // t = test selected model
      if (input === 't' && filtered[modelIndex]) {
        const m = filtered[modelIndex];
        flash(`🔍 Testing ${m.name}...`);
        (async () => {
          const { testModel } = await import('../services/ai.js');
          const result = await testModel(m);
          setTestResult({ modelId: m.id, ok: result.ok, msg: result.message });
          flash(result.message);
        })();
        return;
      }

      // B = browse remote from selected endpoint
      if (input === 'B' && filtered[modelIndex]) {
        const m = filtered[modelIndex];
        setBrowseSource(m);
        setRemoteLoading(true);
        setRemoteError('');
        setRemoteModels([]);
        setRemoteIndex(0);
        setScreen('browseRemote');
        (async () => {
          const { browseModels } = await import('../services/ai.js');
          const result = await browseModels(m);
          setRemoteLoading(false);
          if (result.error) setRemoteError(result.error);
          else setRemoteModels(result.models);
        })();
        return;
      }
    }

    // ── ADD MODEL ──
    if (screen === 'addModel') {
      if (key.escape) { setScreen('models'); return; }

      // Tab = cycle provider
      if (input === '\t') {
        const currentIdx = PROVIDERS.indexOf((editingModel?.provider as any) || 'glm');
        const nextIdx = (currentIdx + 1) % PROVIDERS.length;
        const next = PROVIDERS[nextIdx];
        const meta = PROVIDER_META[next];
        if (editingModel) {
          setEditingModel({
            ...editingModel,
            provider: next,
            base_url: meta.defaultUrl,
            model: meta.defaultModel,
            api_key: editingModel.api_key,
          });
          setEditField('name');
          setEditBuffer(editingModel.name || meta.defaultModel);
        }
        return;
      }

      // Jump keys
      if (input === 'p') { setEditField('provider'); setEditBuffer(editingModel?.provider || ''); return; }
      if (input === 'u') { setEditField('base_url'); setEditBuffer(editingModel?.base_url || ''); return; }
      if (input === 'k') { setEditField('api_key'); setEditBuffer(editingModel?.api_key || ''); return; }
      if (input === 'm') { setEditField('model'); setEditBuffer(editingModel?.model || ''); return; }

      if (key.return) {
        const val = editBuffer.trim();
        if (!val && editField !== 'api_key') { flash('❌ Field cannot be empty'); return; }
        if (editingModel) {
          const updated = { ...editingModel, [editField]: val };
          setEditingModel(updated);

          // After last field (model), save
          if (editField === 'model') {
            addModel(updated.name, updated.provider, updated.base_url, updated.api_key, updated.model);
            loadModels();
            flash(`✅ Model added: ${updated.name}`);
            setScreen('models');
            return;
          }
          // Advance to next field
          const fieldOrder: ModelField[] = ['name', 'provider', 'base_url', 'api_key', 'model'];
          const nextField = fieldOrder[fieldOrder.indexOf(editField) + 1];
          if (nextField) {
            setEditField(nextField);
            setEditBuffer(String(updated[nextField] || ''));
          }
        }
      } else if (key.backspace || key.delete) {
        setEditBuffer(b => b.slice(0, -1));
      } else if (input && !key.escape) {
        setEditBuffer(b => b + input);
      }
    }

    // ── EDIT MODEL ──
    if (screen === 'editModel') {
      if (key.escape) { setScreen('models'); return; }

      const fieldOrder: ModelField[] = ['name', 'provider', 'base_url', 'api_key', 'model'];

      if (key.return) {
        const val = editBuffer.trim();
        if (!val && editField !== 'api_key') { flash('❌ Field cannot be empty'); return; }
        if (editingModel) {
          const updated = { ...editingModel, [editField]: val };
          setEditingModel(updated);
          updateModel(updated.id, updated);
          loadModels();

          const nextField = fieldOrder[fieldOrder.indexOf(editField) + 1];
          if (nextField) {
            setEditField(nextField);
            setEditBuffer(String(updated[nextField] || ''));
          } else {
            flash(`✅ Model updated: ${updated.name}`);
            setScreen('models');
          }
        }
      } else if (key.backspace || key.delete) {
        setEditBuffer(b => b.slice(0, -1));
      } else if (input && !key.escape) {
        setEditBuffer(b => b + input);
      }
    }

    // ── BROWSE REMOTE MODELS ──
    if (screen === 'browseRemote') {
      if (key.escape) { setScreen('models'); return; }
      const maxRemoteIdx = Math.max(0, remoteModels.length - 1);

      if (key.upArrow) setRemoteIndex(i => Math.max(0, i - 1));
      if (key.downArrow) setRemoteIndex(i => Math.min(maxRemoteIdx, i + 1));

      // a = add selected
      if (input === 'a' && remoteModels[remoteIndex] && browseSource) {
        const rm = remoteModels[remoteIndex];
        const existing = models.find(m => m.model === rm.id && m.provider === browseSource.provider);
        if (existing) {
          flash(`⚠️  Already exists: ${existing.name}`);
        } else {
          addModel(rm.name, browseSource.provider, browseSource.base_url, browseSource.api_key, rm.id);
          loadModels();
          flash(`✅ Added: ${rm.name} (${rm.id})`);
        }
      }

      // s = add & switch
      if (input === 's' && remoteModels[remoteIndex] && browseSource) {
        const rm = remoteModels[remoteIndex];
        const existing = models.find(m => m.model === rm.id && m.provider === browseSource.provider);
        if (!existing) {
          const newId = addModel(rm.name, browseSource.provider, browseSource.base_url, browseSource.api_key, rm.id);
          loadModels();
          setActiveModel(newId);
          flash(`✅ Added & active: ${rm.name}`);
        } else {
          setActiveModel(existing.id);
          loadModels();
          flash(`✅ Active: ${rm.name}`);
        }
      }

      // r = refresh
      if (input === 'r' && browseSource) {
        setRemoteLoading(true);
        setRemoteError('');
        setRemoteModels([]);
        (async () => {
          const { browseModels } = await import('../services/ai.js');
          const result = await browseModels(browseSource);
          setRemoteLoading(false);
          if (result.error) setRemoteError(result.error);
          else setRemoteModels(result.models);
        })();
      }
    }

    // ── RESULTS / SEARCHING ──
    if (screen === 'results' || screen === 'searching') {
      if (key.escape || input === 'q' || input === 'b') { setScreen('menu'); }
    }
  });

  // ═══════════════════════════════════════════════
  // Search
  // ═══════════════════════════════════════════════

  async function runSearch() {
    setScreen('searching');
    setSearchLog([]);
    addLog('🔄 Starting job search...');

    if (!resumeLoaded || !resumePath) {
      addLog('⚠️  No resume loaded! Load one first.');
      return;
    }
    const content = await getResumeContent();
    if (!content) { addLog('❌ No resume content.'); return; }

    try {
      const { runFullPipeline } = await import('../services/pipeline.js');
      await runFullPipeline(content, resumePath, addLog);
      loadJobs();
    } catch (err: any) {
      addLog(`❌ Pipeline error: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════
  // Computed display data
  // ═══════════════════════════════════════════════

  const separator = '━'.repeat(termWidth - 2);
  const thinSep = '─'.repeat(termWidth - 4);
  const activeModel = models.find(m => m.is_active === 1);

  // Filtered model list
  const filteredModels = useMemo(() => {
    if (providerFilter) return models.filter(m => m.provider === providerFilter);
    return [...models];
  }, [models, providerFilter]);

  const safeModelIndex = filteredModels.length > 0
    ? Math.min(modelIndex, filteredModels.length - 1)
    : 0;

  // Build display rows with provider group headers
  const { displayRows, selectedDisplayPos } = useMemo(() => {
    const rows: DisplayRow[] = [];
    let flatIdx = 0;
    let selPos = -1;
    const providerOrder = providerFilter ? [providerFilter] : [...PROVIDERS];

    for (const prov of providerOrder) {
      const provModels = filteredModels.filter(m => m.provider === prov);
      if (provModels.length === 0) continue;

      if (!providerFilter) {
        rows.push({ type: 'header', provider: prov, count: provModels.length });
      }
      for (const m of provModels) {
        if (flatIdx === safeModelIndex) selPos = rows.length;
        rows.push({ type: 'model', model: m, flatIndex: flatIdx });
        flatIdx++;
      }
    }
    return { displayRows: rows, selectedDisplayPos: selPos };
  }, [filteredModels, providerFilter, safeModelIndex]);

  // Scroll window for model list
  const maxModelRows = Math.max(3, termHeight - 22);
  const modelScrollStart = selectedDisplayPos >= 0
    ? Math.max(0, Math.min(selectedDisplayPos - Math.floor(maxModelRows * 0.4), displayRows.length - maxModelRows))
    : 0;
  const visibleModelRows = displayRows.slice(modelScrollStart, modelScrollStart + maxModelRows);

  // Scroll for remote models
  const maxRemoteRows = Math.max(3, termHeight - 16);
  const remoteScrollStart = Math.max(0, Math.min(remoteIndex - Math.floor(maxRemoteRows * 0.4), remoteModels.length - maxRemoteRows));
  const visibleRemoteRows = remoteModels.slice(remoteScrollStart, remoteScrollStart + maxRemoteRows);

  // Field labels for model editor
  const fieldLabels: Record<ModelField, string> = {
    name: 'Name', provider: 'Provider', base_url: 'Base URL', api_key: 'API Key', model: 'Model ID',
  };

  // ═══════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════

  return (
    <Box flexDirection="column" width={termWidth} height={termHeight}>

      {/* Banner */}
      <Box flexDirection="column" alignItems="center" paddingTop={1}>
        {bannerText.split('\n').map((line, i) => (
          <Text key={i} color="red" bold>{line}</Text>
        ))}
      </Box>
      <Box><Text color="red" bold>{separator}</Text></Box>

      {/* Status flash */}
      {statusMsg && (
        <Box borderStyle="round" borderColor="red" paddingX={2}>
          <Text color="white" bold>{statusMsg}</Text>
        </Box>
      )}

      <Box flexDirection="column" flexGrow={1} paddingX={1}>

        {/* Header */}
        <Box borderStyle="bold" borderColor="red" paddingX={2} paddingY={1} justifyContent="space-between">
          <Text color="red" bold>💀 JACK HUNT</Text>
          <Box gap={4}>
            <Text color="gray">Model: <Text color="red" bold>{activeModel?.name || 'none'}</Text></Text>
            <Text color="gray">Jobs: <Text color="red" bold>{jobs.length}</Text></Text>
            <Text color="gray">High: <Text color="green" bold>{jobs.filter((j: any) => j.match_score >= 70).length}</Text></Text>
          </Box>
        </Box>

        <Box marginTop={1} marginBottom={1}><Text color="red">{thinSep}</Text></Box>

        {/* ═══════════════════════════════════════════ */}
        {/* MENU                                      */}
        {/* ═══════════════════════════════════════════ */}
        {screen === 'menu' && (
          <Box flexDirection="column" flexGrow={1}>
            <Text bold color="red">☠ MAIN MENU</Text>
            <Box marginTop={1} flexDirection="column">
              {menuItems.map((item, idx) => (
                <Box key={idx} marginTop={1}>
                  <Text>
                    {idx === menuIndex
                      ? <Text color="red" bold backgroundColor="white"> ▶ </Text>
                      : <Text color="gray">   </Text>}
                    <Text color={idx === menuIndex ? 'white' : 'gray'} bold={idx === menuIndex}
                      backgroundColor={idx === menuIndex ? 'red' : undefined}>
                      {' '}{item.label}{' '}
                    </Text>
                  </Text>
                </Box>
              ))}
            </Box>
            <Box marginTop={2}><Text color="red">{thinSep}</Text></Box>
            <Box justifyContent="space-between">
              <Text color="gray">↑↓ navigate • Enter select • / model</Text>
              <Text color="gray">q / ESC quit</Text>
            </Box>
          </Box>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* RESUME INPUT                              */}
        {/* ═══════════════════════════════════════════ */}
        {screen === 'inputPath' && (
          <Box flexDirection="column" flexGrow={1}>
            <Text bold color="red">📄 LOAD RESUME</Text>
            <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="red" paddingX={2} paddingY={1}>
              <Text color="gray">Path to resume (.md, .txt, .pdf):</Text>
              <Box marginTop={1}>
                <Text color="red" bold>Path: </Text>
                <Text color="white" bold>{inputBuffer}<Text color="red" backgroundColor="gray"> </Text></Text>
              </Box>
            </Box>
            <Box marginTop={2}><Text color="red">{thinSep}</Text></Box>
            <Text color="gray">Enter confirm • ESC back</Text>
          </Box>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* MODELS — Redesigned                       */}
        {/* ═══════════════════════════════════════════ */}
        {screen === 'models' && (
          <Box flexDirection="column" flexGrow={1}>
            {/* Title row */}
            <Box justifyContent="space-between">
              <Text bold color="red">⚙️  MODEL CONFIGURATION</Text>
              <Text color="gray">{filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''} {providerFilter ? `in ${PROVIDER_META[providerFilter]?.label || providerFilter}` : 'total'}</Text>
            </Box>

            {/* Active model card */}
            <Box marginTop={1} borderStyle="round" borderColor="green" paddingX={2} paddingY={1}>
              <Box justifyContent="space-between">
                <Box>
                  <Text color="green" bold>● ACTIVE </Text>
                  <Text color="white" bold>{activeModel?.name || 'none configured'}</Text>
                </Box>
                <Text color="gray" dimColor>{activeModel?.model || ''}</Text>
              </Box>
              {activeModel && (
                <Box gap={2} marginTop={1}>
                  <Text color="gray" dimColor>
                    {PROVIDER_META[activeModel.provider]?.label || activeModel.provider}
                  </Text>
                  <Text color="gray" dimColor>•</Text>
                  <Text color="gray" dimColor>{shortUrl(activeModel.base_url)}</Text>
                  {activeModel.api_key && (
                    <>
                      <Text color="gray" dimColor>•</Text>
                      <Text color="gray" dimColor>Key: {activeModel.api_key.slice(0, 10)}…</Text>
                    </>
                  )}
                </Box>
              )}
            </Box>

            {/* Provider filter tabs */}
            <Box marginTop={1} gap={0}>
              {/* All tab */}
              <Text
                color={providerFilter === null ? 'white' : 'gray'}
                bold={providerFilter === null}
                backgroundColor={providerFilter === null ? 'red' : undefined}
              >
                {` 1:${PROVIDER_META.glm.label === 'GLM' ? 'ALL' : 'ALL'}(${models.length}) `}
              </Text>
              {/* Provider tabs */}
              {PROVIDERS.map((p, i) => {
                const count = models.filter(m => m.provider === p).length;
                const isActive = providerFilter === p;
                return (
                  <Text
                    key={p}
                    color={isActive ? 'white' : 'gray'}
                    bold={isActive}
                    backgroundColor={isActive ? 'red' : undefined}
                  >
                    {` ${(i + 2)}:${PROVIDER_META[p].label.slice(0, 5)}(${count}) `}
                  </Text>
                );
              })}
            </Box>

            <Box marginTop={1}><Text color="gray" dimColor>{thinSep}</Text></Box>

            {/* Model list */}
            <Box flexDirection="column" flexGrow={1}>
              {filteredModels.length === 0 ? (
                <Box paddingY={2} justifyContent="center">
                  <Text color="gray">No models {providerFilter ? `for ${PROVIDER_META[providerFilter]?.label}` : 'configured'}. Press 'a' to add one.</Text>
                </Box>
              ) : (
                visibleModelRows.map((row, idx) => {
                  // Provider group header
                  if (row.type === 'header') {
                    const meta = PROVIDER_META[row.provider];
                    const label = meta?.label || row.provider.toUpperCase();
                    const dashCount = Math.max(2, termWidth - 12 - label.length - String(row.count).length);
                    return (
                      <Box key={`h-${row.provider}`} marginTop={idx > 0 ? 1 : 0}>
                        <Text color={meta?.color || 'gray'} bold dimColor>
                          {'  ══ '}{label}<Text color={meta?.color || 'gray'} dimColor> ({row.count}) </Text>
                          <Text color={meta?.color || 'gray'} dimColor>{'═'.repeat(dashCount)}</Text>
                        </Text>
                      </Box>
                    );
                  }

                  // Model row
                  const m = row.model;
                  const isSelected = row.flatIndex === safeModelIndex;
                  const isActiveModel = m.is_active === 1;
                  const meta = PROVIDER_META[m.provider];
                  const wasTested = testResult?.modelId === m.id;

                  return (
                    <Box key={`m-${m.id}`} paddingLeft={providerFilter ? 1 : 2}>
                      <Text backgroundColor={isSelected ? 'red' : undefined}>
                        {/* Selection cursor */}
                        {isSelected
                          ? <Text color="white" bold> ▶ </Text>
                          : <Text>   </Text>}
                        {/* Active indicator */}
                        {isActiveModel
                          ? <Text color={isSelected ? 'white' : 'green'} bold>● </Text>
                          : <Text color={isSelected ? 'white' : 'gray'}>○ </Text>}
                        {/* Model name */}
                        <Text
                          color={isSelected ? 'white' : (meta?.color || 'white')}
                          bold={isSelected || isActiveModel}
                        >
                          {m.name.padEnd(22)}
                        </Text>
                        {/* Model ID */}
                        <Text color={isSelected ? 'white' : 'gray'} dimColor={!isSelected}>
                          {m.model.padEnd(22)}
                        </Text>
                        {/* Endpoint (shortened) */}
                        <Text color={isSelected ? 'white' : 'gray'} dimColor>
                          {shortUrl(m.base_url).padEnd(16)}
                        </Text>
                        {/* Key indicator */}
                        {m.api_key
                          ? <Text color={isSelected ? 'white' : 'gray'} dimColor>🔑</Text>
                          : <Text color={isSelected ? 'white' : 'red'} dimColor>✗ </Text>}
                        {/* Test result indicator */}
                        {wasTested && (
                          <Text color={testResult.ok ? 'green' : 'red'} bold>
                            {testResult.ok ? ' ✓' : ' ✗'}
                          </Text>
                        )}
                      </Text>
                    </Box>
                  );
                })
              )}

              {/* Scroll indicator */}
              {displayRows.length > maxModelRows && (
                <Box justifyContent="center" marginTop={1}>
                  <Text color="gray" dimColor>
                    {modelScrollStart > 0 ? '▲ ' : '  '}
                    {Math.round(((modelScrollStart + maxModelRows) / displayRows.length) * 100)}%
                    {modelScrollStart + maxModelRows < displayRows.length ? ' ▼' : '  '}
                  </Text>
                </Box>
              )}
            </Box>

            {/* Selected model detail line */}
            {filteredModels[safeModelIndex] && (
              <Box paddingX={2} borderStyle="single" borderColor="gray">
                <Text color="gray">
                  {'▸ '}
                  <Text color="white" bold>{filteredModels[safeModelIndex].name}</Text>
                  <Text color="gray"> • </Text>
                  <Text color="gray">{filteredModels[safeModelIndex].model}</Text>
                  <Text color="gray"> • </Text>
                  <Text color="gray" dimColor>{filteredModels[safeModelIndex].base_url}</Text>
                  {filteredModels[safeModelIndex].api_key && (
                    <Text color="gray" dimColor> • Key: {filteredModels[safeModelIndex].api_key.slice(0, 10)}…</Text>
                  )}
                  {filteredModels[safeModelIndex].is_active === 1 && <Text color="green"> ●ACTIVE</Text>}
                </Text>
              </Box>
            )}

            {/* Action bar */}
            <Box marginTop={1}><Text color="red">{thinSep}</Text></Box>
            <Box justifyContent="space-between">
              <Box gap={1}>
                <Text color="gray">Enter</Text><Text color="red">switch</Text>
                <Text color="gray">e</Text><Text color="red">edit</Text>
                <Text color="gray">d</Text><Text color="red">del</Text>
                <Text color="gray">t</Text><Text color="red">test</Text>
                <Text color="gray">B</Text><Text color="red">browse</Text>
                <Text color="gray">a</Text><Text color="red">add</Text>
              </Box>
              <Box gap={1}>
                <Text color="gray">1-6</Text><Text color="red">filter</Text>
                <Text color="gray">PgUp/Dn</Text><Text color="red">scroll</Text>
                <Text color="gray">ESC</Text><Text color="red">back</Text>
              </Box>
            </Box>
          </Box>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ADD MODEL — Redesigned                    */}
        {/* ═══════════════════════════════════════════ */}
        {screen === 'addModel' && (
          <Box flexDirection="column" flexGrow={1}>
            <Text bold color="red">➕ ADD MODEL</Text>

            {/* Provider selector tabs */}
            <Box marginTop={1} gap={0}>
              {PROVIDERS.map((p) => {
                const isActive = editingModel?.provider === p;
                const meta = PROVIDER_META[p];
                return (
                  <Text key={p}
                    color={isActive ? 'white' : 'gray'}
                    bold={isActive}
                    backgroundColor={isActive ? 'red' : undefined}
                  >
                    {` ${meta.label} `}
                  </Text>
                );
              })}
            </Box>

            {/* Provider URL preview */}
            <Box marginTop={1} paddingX={1}>
              <Text color="gray" dimColor>
                {editingModel?.base_url || 'No URL'}
              </Text>
            </Box>

            <Box marginTop={1}><Text color="red">{thinSep}</Text></Box>

            {/* Field editor */}
            <ModelFieldEditor
              editingModel={editingModel}
              editField={editField}
              editBuffer={editBuffer}
              fieldLabels={fieldLabels}
            />

            <Box marginTop={1}><Text color="red">{thinSep}</Text></Box>
            <Box justifyContent="space-between">
              <Box gap={1}>
                <Text color="gray">Tab</Text><Text color="red">cycle provider</Text>
                <Text color="gray">p/u/k/m</Text><Text color="red">jump field</Text>
              </Box>
              <Box gap={1}>
                <Text color="gray">Enter</Text><Text color="red">next/save</Text>
                <Text color="gray">ESC</Text><Text color="red">cancel</Text>
              </Box>
            </Box>
          </Box>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* EDIT MODEL — Redesigned                   */}
        {/* ═══════════════════════════════════════════ */}
        {screen === 'editModel' && (
          <Box flexDirection="column" flexGrow={1}>
            <Box justifyContent="space-between">
              <Text bold color="red">✏️  EDIT MODEL</Text>
              <Text color="white" bold>{editingModel?.name}</Text>
            </Box>

            <Box marginTop={1}><Text color="red">{thinSep}</Text></Box>

            <ModelFieldEditor
              editingModel={editingModel}
              editField={editField}
              editBuffer={editBuffer}
              fieldLabels={fieldLabels}
            />

            <Box marginTop={1}><Text color="red">{thinSep}</Text></Box>
            <Box justifyContent="space-between">
              <Box gap={1}>
                <Text color="gray">p/u/k/m</Text><Text color="red">jump field</Text>
              </Box>
              <Box gap={1}>
                <Text color="gray">Enter</Text><Text color="red">next/save</Text>
                <Text color="gray">ESC</Text><Text color="red">cancel</Text>
              </Box>
            </Box>
          </Box>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* BROWSE REMOTE — Redesigned                */}
        {/* ═══════════════════════════════════════════ */}
        {screen === 'browseRemote' && (
          <Box flexDirection="column" flexGrow={1}>
            {/* Title */}
            <Box justifyContent="space-between">
              <Text bold color="red">🌐 BROWSE REMOTE MODELS</Text>
              <Text color="gray">Source: <Text color="white" bold>{browseSource?.name || '—'}</Text></Text>
            </Box>

            {/* Endpoint */}
            <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={2}>
              <Text color="gray" dimColor>{browseSource?.base_url}</Text>
            </Box>

            {/* Loading */}
            {remoteLoading && (
              <Box marginTop={2} justifyContent="center">
                <Text color="red" bold>🔄 Fetching model list...</Text>
              </Box>
            )}

            {/* Error */}
            {remoteError && !remoteLoading && (
              <Box marginTop={2} borderStyle="round" borderColor="red" paddingX={2} paddingY={1} flexDirection="column">
                <Text color="red" bold>❌ Error</Text>
                <Text color="gray">{remoteError}</Text>
              </Box>
            )}

            {/* Model list */}
            {!remoteLoading && remoteModels.length > 0 && (
              <Box flexDirection="column" flexGrow={1}>
                <Box marginTop={1} justifyContent="space-between">
                  <Text color="gray" bold>{remoteModels.length} models available</Text>
                  <Text color="gray" dimColor>
                    {remoteModels.length > maxRemoteRows
                      ? `showing ${remoteScrollStart + 1}-${Math.min(remoteScrollStart + maxRemoteRows, remoteModels.length)}`
                      : ''}
                  </Text>
                </Box>

                <Box marginTop={1} flexDirection="column" flexGrow={1}>
                  {/* Column header */}
                  <Box paddingLeft={1}>
                    <Text color="gray" dimColor bold>
                      {'     '}
                      {'MODEL NAME'.padEnd(26)}
                      {'MODEL ID'.padEnd(26)}
                      {'STATUS'}
                    </Text>
                  </Box>
                  <Box paddingLeft={1}><Text color="gray" dimColor>{thinSep.slice(0, termWidth - 8)}</Text></Box>

                  {visibleRemoteRows.map((rm, idx) => {
                    const realIdx = idx + remoteScrollStart;
                    const isSelected = realIdx === remoteIndex;
                    const isExisting = models.some(m => m.model === rm.id);
                    return (
                      <Box key={rm.id} paddingLeft={1}>
                        <Text backgroundColor={isSelected ? 'red' : undefined}>
                          {isSelected
                            ? <Text color="white" bold> ▶ </Text>
                            : <Text>   </Text>}
                          {/* Name */}
                          <Text color={isSelected ? 'white' : 'white'} bold={isSelected}>
                            {rm.name.padEnd(26)}
                          </Text>
                          {/* ID */}
                          <Text color={isSelected ? 'white' : 'gray'} dimColor={!isSelected}>
                            {rm.id.padEnd(26)}
                          </Text>
                          {/* Status */}
                          {isExisting
                            ? <Text color={isSelected ? 'white' : 'yellow'} bold> ✓ ADDED </Text>
                            : <Text color={isSelected ? 'white' : 'gray'} dimColor> + NEW   </Text>}
                        </Text>
                      </Box>
                    );
                  })}

                  {/* Scroll indicator */}
                  {remoteModels.length > maxRemoteRows && (
                    <Box justifyContent="center" marginTop={1}>
                      <Text color="gray" dimColor>
                        {remoteScrollStart > 0 ? '▲ ' : '  '}
                        {Math.round(((remoteScrollStart + maxRemoteRows) / remoteModels.length) * 100)}%
                        {remoteScrollStart + maxRemoteRows < remoteModels.length ? ' ▼' : '  '}
                      </Text>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Empty state */}
            {!remoteLoading && !remoteError && remoteModels.length === 0 && (
              <Box marginTop={2} paddingY={2} justifyContent="center">
                <Text color="gray">No models returned. Check your API key and base URL.</Text>
              </Box>
            )}

            <Box marginTop={1}><Text color="red">{thinSep}</Text></Box>
            <Box justifyContent="space-between">
              <Box gap={1}>
                <Text color="gray">a</Text><Text color="red">add</Text>
                <Text color="gray">s</Text><Text color="red">add+switch</Text>
                <Text color="gray">r</Text><Text color="red">refresh</Text>
              </Box>
              <Box gap={1}>
                <Text color="gray">↑↓</Text><Text color="red">select</Text>
                <Text color="gray">ESC</Text><Text color="red">back</Text>
              </Box>
            </Box>
          </Box>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* SEARCHING                                 */}
        {/* ═══════════════════════════════════════════ */}
        {screen === 'searching' && (
          <Box flexDirection="column" flexGrow={1}>
            <Text bold color="red">🔍 SEARCHING FOR JOBS</Text>
            <Box marginTop={1} flexDirection="column" flexGrow={1}>
              <SearchRunner onRun={runSearch} />
              <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1} paddingY={1}
                flexGrow={1} overflowY="hidden">
                {searchLog.length === 0 ? (
                  <Text color="gray">Waiting...</Text>
                ) : (
                  searchLog.slice(-(termHeight - 16)).map((log, i) => (
                    <Text key={i} color="red">{log}</Text>
                  ))
                )}
              </Box>
            </Box>
            <Box marginTop={1}><Text color="red">{thinSep}</Text></Box>
            <Text color="gray">b / ESC back</Text>
          </Box>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* RESULTS                                   */}
        {/* ═══════════════════════════════════════════ */}
        {screen === 'results' && (
          <Box flexDirection="column" flexGrow={1}>
            <Text bold color="red">📋 SAVED JOBS ({jobs.length})</Text>
            <Box marginTop={1} flexDirection="column" flexGrow={1} overflowY="hidden">
              {jobs.length === 0 ? (
                <Text color="gray">No jobs saved yet. Start a search first!</Text>
              ) : (
                jobs.map((job: any, idx: number) => {
                  const sc = job.match_score >= 70 ? 'green' : job.match_score >= 40 ? 'yellow' : 'red';
                  return (
                    <Box key={String(job.id || idx)} marginTop={1} flexDirection="column"
                      borderStyle="round" borderColor={sc as any} paddingX={2}>
                      <Box justifyContent="space-between">
                        <Text>
                          <Text bold color={sc as any}>[{job.match_score}%]</Text>
                          <Text color="white" bold> {job.title}</Text>
                        </Text>
                        <Text color="gray">{job.source}</Text>
                      </Box>
                      <Box gap={2}>
                        <Text color="gray">🏢 {job.company}</Text>
                        <Text color="gray">📍 {job.location}</Text>
                        {job.salary && job.salary !== 'Not specified' && <Text color="red" bold>💰 {job.salary}</Text>}
                      </Box>
                      {job.url && <Text color="red" dimColor wrap="truncate-end">{job.url}</Text>}
                      {job.analysis && <Text color="gray" dimColor wrap="truncate-end">{job.analysis}</Text>}
                      {job.matched_skills && <Text color="yellow" dimColor>✨ {job.matched_skills}</Text>}
                    </Box>
                  );
                })
              )}
            </Box>
            <Box marginTop={1}><Text color="red">{thinSep}</Text></Box>
            <Box justifyContent="space-between">
              <Text color="gray">b / ESC back</Text>
              <Text color="red" bold>{jobs.filter((j: any) => j.match_score >= 70).length} high matches</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Bottom bar */}
      <Box><Text color="red" bold>{separator}</Text></Box>
      <Box paddingX={1}>
        <Text color="gray" dimColor>JACK HUNT v1.0.0 • {activeModel?.name || 'no model'} • {new Date().toLocaleDateString()}</Text>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════
// Shared field editor component — redesigned
// ═══════════════════════════════════════════════════════════

function ModelFieldEditor({ editingModel, editField, editBuffer, fieldLabels }: {
  editingModel: ModelConfig | null;
  editField: ModelField;
  editBuffer: string;
  fieldLabels: Record<ModelField, string>;
}) {
  if (!editingModel) return null;
  const fields: ModelField[] = ['name', 'provider', 'base_url', 'api_key', 'model'];

  function displayValue(f: ModelField): string {
    const model = editingModel!;
    const val = String(model[f] || '');
    if (f === 'api_key' && val.length > 0) {
      return val.slice(0, 12) + '●'.repeat(Math.min(val.length - 12, 20));
    }
    return val;
  }

  return (
    <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor="red" paddingX={2} paddingY={1}>
      {/* Column header */}
      <Box>
        <Text color="red" bold dimColor>{'FIELD'.padEnd(12)}</Text>
        <Text color="gray" dimColor>│ </Text>
        <Text color="gray" dimColor bold>{'VALUE'}</Text>
      </Box>
      <Box marginBottom={1}><Text color="gray" dimColor>{'─'.repeat(termWidthHack())}</Text></Box>

      {/* Fields */}
      {fields.map(f => {
        const isEditing = f === editField;
        return (
          <Box key={f}>
            {/* Label */}
            <Text color={isEditing ? 'red' : 'gray'} bold={isEditing}>
              {fieldLabels[f].toUpperCase().padEnd(12)}
            </Text>
            <Text color="gray">│ </Text>
            {/* Value */}
            {isEditing ? (
              <Text color="white" bold backgroundColor="gray">
                {editBuffer}
                <Text color="white" backgroundColor="red">█</Text>
              </Text>
            ) : (
              <Text color={f === 'api_key' ? 'gray' : 'white'} dimColor={f === 'api_key'}>
                {displayValue(f) || <Text color="gray" dimColor>—</Text>}
              </Text>
            )}
            {isEditing && <Text color="red" bold> ◀</Text>}
          </Box>
        );
      })}
    </Box>
  );
}

/** Hack to get a reasonable field width since we can't use hooks in non-component context */
function termWidthHack(): number {
  return 56;
}

// ═══════════════════════════════════════════════════════════
// Search runner component
// ═══════════════════════════════════════════════════════════

function SearchRunner({ onRun }: { onRun: () => void }) {
  const [ran, setRan] = useState(false);
  useEffect(() => { if (!ran) { setRan(true); onRun(); } }, []);
  return null;
}
