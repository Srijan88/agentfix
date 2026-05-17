'use client';

import { useState } from 'react';
import type {
  PromptPack,
  AnalysisResult,
  AttackResult,
  HealedPromptPack,
  ChatMessage,
  ResearchResult,
  HealVerifyResult,
  FixedScenarioRetestResult,
  AttackScenario,
  VerifiedAttackResult,
  ChangeMade,
} from '@/types';
import { SAMPLE_WEAK_PROMPT } from '@/lib/mock-data';
import { downloadAsFile, copyToClipboard, generateId } from '@/lib/utils';

/* ─── Types ──────────────────────────────────────────────────── */
type ActiveTab =
  | 'input' | 'analyze' | 'attack' | 'heal'
  | 'verify' | 'compare' | 'ask' | 'research' | 'report';

type SpeechRecognitionResultEvent = { results: { 0: { 0: { transcript: string } } } };
type SpeechRecognitionInstance = {
  continuous: boolean; interimResults: boolean; lang: string;
  onstart: (() => void) | null; onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null; start: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type ActionKey = 'analyze' | 'attack' | 'heal' | 'retest' | 'healVerify' | 'ask' | 'research' | 'report';
type ActionStatus = 'idle' | 'loading' | 'success' | 'failure';
type ActionState = { status: ActionStatus; error: string | null };
type ApiErrorResponse = { error?: string };

const defaultActionState: ActionState = { status: 'idle', error: null };

/* ─── Helpers ────────────────────────────────────────────────── */
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json() as T & ApiErrorResponse;
  if (!response.ok || data.error) throw new Error(data.error || `Request failed with status ${response.status}`);
  return data;
}

function verifiedResultsToAttackResult(results: VerifiedAttackResult[]): AttackResult {
  const scenarios: AttackScenario[] = results.map((r) => ({
    id: r.id, category: r.category, scenarioName: r.scenarioName,
    simulatedInput: r.simulatedUserInput, expectedBehavior: r.expectedSafeBehavior,
    likelyBehavior: r.actualOrLikelyBehavior, actualOrLikelyBehavior: r.actualOrLikelyBehavior,
    agentResponse: r.agentResponse, transcript: r.transcript,
    passed: r.passed, failureReason: r.failureReason, severity: r.severity,
    confidence: r.confidence, recommendedDefense: r.recommendedDefense,
  }));
  const failed = scenarios.filter((s) => !s.passed);
  return {
    scenarios,
    summary: {
      totalTests: scenarios.length, passed: scenarios.length - failed.length, failed: failed.length,
      criticalFailures: failed.filter((s) => s.severity === 'critical').length,
      highFailures: failed.filter((s) => s.severity === 'high').length,
    },
  };
}

function promptPackToHealedPromptPack(prompt: PromptPack, changes: ChangeMade[] = []): HealedPromptPack {
  return {
    ...prompt,
    improvements: changes.map((c) => ({ section: c.section as keyof PromptPack, changes: [c.change] })),
  };
}

const promptSections: { key: keyof PromptPack; label: string }[] = [
  { key: 'systemPrompt', label: 'System Prompt' },
  { key: 'developerPrompt', label: 'Developer Prompt' },
  { key: 'toolUseInstructions', label: 'Tool Use Instructions' },
  { key: 'fallbackBehavior', label: 'Fallback Behavior' },
  { key: 'escalationRules', label: 'Escalation Rules' },
  { key: 'confirmationRules', label: 'Confirmation Rules' },
  { key: 'refusalRedirectRules', label: 'Refusal / Redirect Rules' },
  { key: 'agentBoundaries', label: 'Agent Boundaries' },
];

/* ─── Sidebar nav config ─────────────────────────────────────── */
const sidebarNav: { tab: ActiveTab; label: string; icon: string }[] = [
  { tab: 'input',    label: 'Prompt Lab',   icon: '⬛' },
  { tab: 'analyze',  label: 'Analysis',     icon: '📊' },
  { tab: 'attack',   label: 'Attack Mode',  icon: '🛡' },
  { tab: 'heal',     label: 'Self-Improve',    icon: '✦' },
  { tab: 'verify',   label: 'Verify Improvement',   icon: '✓' },
  { tab: 'compare',  label: 'Comparison',   icon: '⇄' },
  { tab: 'ask',      label: 'Ask AI',       icon: '💬' },
  { tab: 'research', label: 'Research',     icon: '🔬' },
  { tab: 'report',   label: 'Report',       icon: '📄' },
];

/* ─── Severity badge ─────────────────────────────────────────── */
function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-900/40 text-red-300 border border-red-700/50',
    high:     'bg-orange-900/40 text-orange-300 border border-orange-700/50',
    medium:   'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50',
    low:      'bg-blue-900/40 text-blue-300 border border-blue-700/50',
    none:     'bg-secondary/10 text-secondary border border-secondary/30',
    informational: 'bg-surface-container text-on-surface-variant border border-outline-variant',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium uppercase tracking-wide ${map[severity] ?? map.informational}`}>
      {severity}
    </span>
  );
}


/* ═══════════════════════════════════════════════════════════════ */
export default function Home() {
  /* ─── State ─── */
  const [activeTab, setActiveTab] = useState<ActiveTab>('input');
  const [promptPack, setPromptPack] = useState<PromptPack>(SAMPLE_WEAK_PROMPT);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [originalAttackResults, setOriginalAttackResults] = useState<AttackResult | null>(null);
  const [healedAttackResults, setHealedAttackResults] = useState<AttackResult | null>(null);
  const [healedPrompt, setHealedPrompt] = useState<HealedPromptPack | null>(null);
  const [maxHealingIterations, setMaxHealingIterations] = useState(3);
  const [healVerifyResult, setHealVerifyResult] = useState<HealVerifyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionStates, setActionStates] = useState<Record<ActionKey, ActionState>>({
    analyze: defaultActionState, attack: defaultActionState, heal: defaultActionState,
    retest: defaultActionState, healVerify: defaultActionState,
    ask: defaultActionState, research: defaultActionState, report: defaultActionState,
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const toggleCard = (id: string) => setExpandedCards((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>(['context-identity', 'system-boundaries', 'tool-exploitation']);
  const [attackVolume, setAttackVolume] = useState<number>(14);
  const [liveProbe, setLiveProbe] = useState<boolean>(false);
  const [attackTurns, setAttackTurns] = useState<number>(1);
  const toggleProfile = (key: string) => setSelectedProfiles((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  const [chatInput, setChatInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [researchTopic, setResearchTopic] = useState('');
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [generatedReport, setGeneratedReport] = useState<string>('');

  /* ─── Derived ─── */
  const baselineScore = analysisResult?.reliabilityScore.overall ?? 0;
  const originalFailedCount = originalAttackResults?.summary.failed ?? 0;
  const finalVerifiedPromptPack = healVerifyResult?.finalPromptPack ?? null;
  const finalPromptForComparison = finalVerifiedPromptPack ?? healedPrompt;
  const finalVerificationResults = healVerifyResult?.iterations.at(-1)?.attackResults ?? null;
  const healedFailedCount = healVerifyResult?.finalFailedCount ?? healedAttackResults?.summary.failed ?? 0;
  const healedScore = healVerifyResult?.reliabilityAfter ?? (
    healedAttackResults && healedAttackResults.summary.totalTests > 0
      ? Math.round((healedAttackResults.summary.passed / healedAttackResults.summary.totalTests) * 100)
      : 0
  );
  const vulnerabilityReduction = healVerifyResult?.vulnerabilityReduction ?? (
    originalFailedCount > 0
      ? Math.max(0, Math.round(((originalFailedCount - healedFailedCount) / originalFailedCount) * 100))
      : 0
  );

  /* ─── Action helpers ─── */
  const setActionState = (action: ActionKey, state: ActionState) =>
    setActionStates((prev) => ({ ...prev, [action]: state }));
  const startAction   = (a: ActionKey) => setActionState(a, { status: 'loading', error: null });
  const succeedAction = (a: ActionKey) => setActionState(a, { status: 'success', error: null });
  const failAction    = (a: ActionKey, err: unknown) =>
    setActionState(a, { status: 'failure', error: err instanceof Error ? err.message : 'Something went wrong. Please try again.' });

  /* ─── Handlers ─── */
  const handleAnalyze = async () => {
    setIsLoading(true); startAction('analyze');
    try {
      const result = await postJson<AnalysisResult>('/api/analyze', { promptPack });
      setAnalysisResult(result); succeedAction('analyze'); setActiveTab('analyze');
    } catch (e) { failAction('analyze', e); } finally { setIsLoading(false); }
  };

  const handleAttack = async () => {
    if (selectedProfiles.length === 0) return;
    setIsLoading(true); startAction('attack');
    try {
      const result = await postJson<AttackResult>('/api/attack', {
        promptPack,
        selectedProfiles,
        totalAttacksRequested: attackVolume,
        liveProbe,
        attackTurns,
      });
      setOriginalAttackResults(result); setHealedAttackResults(null); setHealVerifyResult(null);
      succeedAction('attack'); setActiveTab('attack');
    } catch (e) { failAction('attack', e); } finally { setIsLoading(false); }
  };

  const handleHeal = async () => {
    setIsLoading(true); startAction('heal');
    try {
      const result = await postJson<HealedPromptPack>('/api/improve', {
        promptPack,
        issues: analysisResult?.issues || [],
        attackResults: originalAttackResults?.scenarios || [],
      });
      setHealedPrompt(result); setHealedAttackResults(null); setHealVerifyResult(null);
      succeedAction('heal'); setActiveTab('heal');
    } catch (e) { failAction('heal', e); } finally { setIsLoading(false); }
  };

  const handleRetest = async () => {
    if (!healedPrompt || !originalAttackResults) return;
    setIsLoading(true); startAction('retest');
    try {
      const result = await postJson<FixedScenarioRetestResult>('/api/retest', {
        promptPack: healedPrompt, scenarios: originalAttackResults.scenarios,
      });
      setHealedAttackResults(verifiedResultsToAttackResult(result.results));
      succeedAction('retest'); setActiveTab('compare');
    } catch (e) { failAction('retest', e); } finally { setIsLoading(false); }
  };

  const handleHealVerify = async () => {
    if (!originalAttackResults?.scenarios.length) {
      failAction('healVerify', new Error('No attack scenarios found. Run Attack Mode first.'));
      setActiveTab('verify'); return;
    }
    if (!Number.isInteger(maxHealingIterations) || maxHealingIterations < 1 || maxHealingIterations > 5) {
      failAction('healVerify', new Error('Max healing iterations must be between 1 and 5.'));
      setActiveTab('verify'); return;
    }
    setIsLoading(true); startAction('healVerify');
    try {
      const result = await postJson<HealVerifyResult>('/api/improve-verify', {
        promptPack, analysisResult, originalAttackResults, maxIterations: maxHealingIterations,
      });
      const changes = result.iterations.flatMap((it) => it.changesMade);
      setHealVerifyResult(result);
      setHealedPrompt(promptPackToHealedPromptPack(result.finalPromptPack, changes));
      setHealedAttackResults(verifiedResultsToAttackResult(result.iterations.at(-1)?.attackResults ?? []));
      succeedAction('healVerify'); setActiveTab('verify');
    } catch (e) { failAction('healVerify', e); } finally { setIsLoading(false); }
  };

  const handleAskQuestion = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: chatInput, timestamp: new Date() };
    setChatMessages((prev) => [...prev, userMsg]); setChatInput('');
    setIsLoading(true); startAction('ask');
    try {
      const data = await postJson<{ answer: string }>('/api/ask', {
        question: userMsg.content,
        context: { promptPack, analysisResult, attackResult: originalAttackResults, healedPrompt, healVerifyResult, finalVerifiedPromptPack },
      });
      setChatMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: data.answer, timestamp: new Date() }]);
      succeedAction('ask');
    } catch (e) { failAction('ask', e); } finally { setIsLoading(false); }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { alert('Speech recognition not supported'); return; }
    const sw = window as Window & typeof globalThis & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
    const SR = sw.SpeechRecognition || sw.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-US';
    r.onstart = () => setIsListening(true);
    r.onresult = (e) => { setChatInput(e.results[0][0].transcript); setIsListening(false); };
    r.onerror = () => setIsListening(false);
    r.onend = () => setIsListening(false);
    r.start();
  };

  const handleResearch = async () => {
    if (!researchTopic.trim()) return;
    setIsLoading(true); startAction('research');
    try {
      const result = await postJson<ResearchResult>('/api/research', { topic: researchTopic, context: JSON.stringify({ promptPack, analysisResult }) });
      setResearchResult(result); succeedAction('research');
    } catch (e) { failAction('research', e); } finally { setIsLoading(false); }
  };

  const handleGenerateReport = async () => {
    setIsLoading(true); startAction('report');
    try {
      const data = await postJson<{ report: string }>('/api/report', {
        reportData: {
          projectName: 'AgentFix Playground', timestamp: new Date().toISOString(),
          originalPromptSummary: 'AI agent prompt analysis',
          issuesFound: analysisResult?.issues || [],
          attackScenariosTested: originalAttackResults?.scenarios || [],
          originalAttackResults, healedAttackResults, healVerifyResult,
          providerUsed: healVerifyResult ? 'Vertex AI Gemini streamGenerateContent' : 'Vertex AI Gemini text',
          maxIterationsSelected: maxHealingIterations,
          iterationsActuallyUsed: healVerifyResult?.iterations.length ?? 0,
          finalRetestResults: finalVerificationResults,
          stoppedReason: healVerifyResult?.stoppedReason,
          sameOriginalScenariosReused: Boolean(healVerifyResult),
          failedScenarios: healedAttackResults
            ? healedAttackResults.scenarios.filter((s) => !s.passed)
            : originalAttackResults?.scenarios.filter((s) => !s.passed) || [],
          recommendedFixes: analysisResult?.issues.map((i) => i.recommendedFix) || [],
          improvedPromptPack: finalPromptForComparison || healedPrompt || promptPack,
          beforeAfterComparison: healVerifyResult
            ? `Same original attack scenarios were re-tested. Original failed: ${healVerifyResult.originalFailedCount}; final failed: ${healVerifyResult.finalFailedCount}; stopped: ${healVerifyResult.stoppedReason}.`
            : healedAttackResults
              ? `Original failed: ${originalFailedCount}; healed failed: ${healedFailedCount}.`
              : 'Re-test has not been run yet.',
          reliabilityScores: { before: healVerifyResult?.reliabilityBefore ?? baselineScore, after: healedScore },
          vulnerabilityReduction,
          remainingRisks: (healedAttackResults?.scenarios.filter((s) => !s.passed) || []).map((s) => ({
            id: s.id, title: `${s.category} risk remains`, category: 'security' as const,
            type: 'weak-guardrails' as const, severity: s.severity, confidence: s.confidence,
            affectedSection: 'systemPrompt' as const, explanation: s.failureReason || s.likelyBehavior,
            recommendedFix: s.recommendedDefense,
          })),
          nextRecommendations: ['Continue testing', 'Monitor in production', 'Regular audits'],
          runtimeLLM: 'Vertex AI Gemini text via streamGenerateContent',
          ibmBobUsage: 'IBM Bob IDE was used for planning, coding, reviewing, and documentation',
        },
      });
      setGeneratedReport(data.report); succeedAction('report'); setActiveTab('report');
    } catch (e) { failAction('report', e); } finally { setIsLoading(false); }
  };

  /* ─── Status banner ─── */
  const renderStatus = (action: ActionKey, successMsg: string) => {
    const s = actionStates[action];
    if (s.status === 'idle') return null;
    if (s.status === 'loading') return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5 text-primary text-sm font-mono">
        <span className="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Working…
      </div>
    );
    if (s.status === 'success') return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-secondary/40 bg-secondary/10 text-secondary text-sm font-mono">
        ✓ {successMsg}
      </div>
    );
    return (
      <div className="px-4 py-3 rounded-lg border border-critical-error/40 bg-critical-error/10 text-critical-error text-sm font-mono">
        <div className="font-semibold mb-0.5">Something went wrong</div>
        <div className="opacity-80">{s.error}</div>
      </div>
    );
  };

  /* ─── Pipeline stages ─── */
  const pipelineStage = (key: ActionKey) => actionStates[key].status;

  function PipelineNode({ label, actionKey }: { label: string; actionKey: ActionKey }) {
    const status = pipelineStage(actionKey);
    const done    = status === 'success';
    const running = status === 'loading';
    const failed  = status === 'failure';
    return (
      <div className="flex flex-col items-center gap-2 bg-surface px-2">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm transition-all ${
          done    ? 'bg-secondary/20 border-secondary text-secondary glow-secondary' :
          running ? 'bg-primary/20 border-primary text-primary' :
          failed  ? 'bg-critical-error/20 border-critical-error text-critical-error' :
                    'bg-surface-container-highest border-outline-variant text-on-surface-variant'
        }`}>
          {done    ? '✓' :
           running ? <span className="animate-spin inline-block">↻</span> :
           failed  ? '✕' : '○'}
        </div>
        <span className={`text-xs font-mono ${
          done ? 'text-secondary' : running ? 'text-primary' : failed ? 'text-critical-error' : 'text-on-surface-variant'
        }`}>{label}</span>
      </div>
    );
  }

  /* ─── Prompt field ─── */
  const PromptField = ({ fieldKey, label }: { fieldKey: keyof PromptPack; label: string }) => (
    <div>
      <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase tracking-widest">{label}</label>
      <textarea
        value={promptPack[fieldKey]}
        onChange={(e) => setPromptPack({ ...promptPack, [fieldKey]: e.target.value })}
        rows={4}
        className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-deep text-on-surface text-sm font-mono resize-y inner-shadow focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
        placeholder={`Enter ${label.toLowerCase()}…`}
      />
    </div>
  );

  /* ═══ RENDER ═══════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-surface text-on-surface">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center justify-between px-10 glass-panel-solid border-b border-white/10 shadow-none">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-black text-primary text-glow-primary tracking-tight">AgentFix</span>
        </div>
        <nav className="hidden md:flex items-center gap-2">
          {['Playground', 'Research', 'Reports', 'Docs'].map((n, i) => (
            <a key={n} href="#"
              className={`text-sm px-4 py-1.5 rounded transition-all ${
                i === 0
                  ? 'text-primary font-bold border-b-2 border-primary pb-1'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50 font-medium'
              }`}>{n}</a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50 transition-colors" title="Notifications">🔔</button>
          <button className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50 transition-colors" title="Settings">⚙</button>
          <div className="w-9 h-9 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center text-primary font-bold text-sm">S</div>
        </div>
      </header>

      <div className="flex pt-20">

        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside className="hidden md:flex flex-col justify-between fixed left-0 top-20 h-[calc(100vh-80px)] w-64 glass-panel-solid border-r border-white/10 py-8 z-40">
          <div>
            <div className="px-6 mb-8">
              <h2 className="text-xl font-bold text-primary mb-1">AgentFix</h2>
              <p className="text-xs font-mono text-on-surface-variant tracking-widest">V2.4-STABLE</p>
            </div>
            <nav className="flex flex-col gap-0.5">
              {sidebarNav.map(({ tab, label, icon }) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full flex items-center gap-3 p-3 border-l-4 transition-all text-left ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-primary-container/20 to-transparent text-primary border-primary'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest border-transparent hover:translate-x-0.5'
                  }`}
                >
                  <span className="text-base w-5 text-center">{icon}</span>
                  <span className="text-sm font-medium">{label}</span>
                  {/* Live status dot */}
                  {tab === 'analyze' && actionStates.analyze.status === 'success' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-secondary" />
                  )}
                  {tab === 'attack' && actionStates.attack.status === 'success' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-secondary" />
                  )}
                  {tab === 'heal' && actionStates.heal.status === 'success' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-secondary" />
                  )}
                  {tab === 'verify' && actionStates.healVerify.status === 'success' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-secondary" />
                  )}
                </button>
              ))}
            </nav>
          </div>

        </aside>

        {/* ── Main Content ──────────────────────────────────── */}
        <main className="flex-1 md:ml-64 p-4 md:p-10 min-h-[calc(100vh-80px)] overflow-y-auto">

          {/* Page title */}
          <div className="mb-16">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Prompt Lab Playground</h1>
            <p className="text-lg text-on-surface-variant">Analyze, attack, and heal your agent prompts in real-time.</p>
          </div>

          {/* ── Stats Grid ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {/* Reliability */}
            <div className="glass-panel metric-gradient rounded-xl p-6 flex flex-col justify-between glow-accent">
              <h3 className="text-xs font-mono text-on-surface-variant mb-4 uppercase tracking-widest">Reliability Score</h3>
              <div className="flex items-end gap-4">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path className="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="100,100" strokeWidth="3" />
                    <path className="text-secondary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${analysisResult?.reliabilityScore.overall ?? 0},100`} strokeWidth="3" />
                  </svg>
                  <span className="absolute text-sm font-bold text-secondary">
                    {analysisResult?.reliabilityScore.overall ?? '--'}
                  </span>
                </div>
                <div className="text-secondary flex items-center text-xs font-mono">
                  {analysisResult ? `${analysisResult.reliabilityScore.overall}/100` : '--/100'}
                </div>
              </div>
            </div>

            {/* Critical Issues */}
            <div className="glass-panel metric-gradient rounded-xl p-6 flex flex-col justify-between glow-accent">
              <h3 className="text-xs font-mono text-on-surface-variant mb-4 uppercase tracking-widest">Critical Issues</h3>
              <div className="flex items-end justify-between">
                <span className="text-5xl font-black text-critical-error" style={{ textShadow: '0 0 8px rgba(255,180,171,0.5)' }}>
                  {analysisResult?.summary.criticalCount ?? 0}
                </span>
                <span className="text-critical-error text-3xl opacity-50">⚠</span>
              </div>
            </div>

            {/* Failed Attacks */}
            <div className="glass-panel metric-gradient rounded-xl p-6 flex flex-col justify-between glow-accent">
              <h3 className="text-xs font-mono text-on-surface-variant mb-4 uppercase tracking-widest">Failed Attacks</h3>
              <div className="flex items-end justify-between">
                <span className="text-5xl font-black text-warning-orange" style={{ textShadow: '0 0 8px rgba(255,140,0,0.5)' }}>
                  {originalAttackResults?.summary.failed ?? 0}
                </span>
                <span className="text-warning-orange text-3xl opacity-50">🛡</span>
              </div>
            </div>

            {/* Total Issues */}
            <div className="glass-panel metric-gradient rounded-xl p-6 flex flex-col justify-between glow-accent">
              <h3 className="text-xs font-mono text-on-surface-variant mb-4 uppercase tracking-widest">Total Issues</h3>
              <div className="flex items-end justify-between">
                <span className="text-5xl font-black text-on-surface">
                  {analysisResult?.issues.length ?? 0}
                </span>
                <span className="text-on-surface-variant text-3xl opacity-50">🐛</span>
              </div>
            </div>
          </div>

          {/* ── Action Bar ────────────────────────────────── */}
          <div className="flex flex-wrap gap-3 mb-6 glass-panel p-4 rounded-xl items-center justify-between">
            <div className="flex flex-wrap gap-3">
              {/* Load Sample */}
              <button
                onClick={() => setPromptPack(SAMPLE_WEAK_PROMPT)}
                className="px-5 py-2 rounded-lg border border-white/10 text-on-surface-variant hover:text-on-surface hover:border-primary transition-all text-sm font-medium flex items-center gap-2"
              >
                📂 Load Sample
              </button>

              {/* Analyze */}
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="px-5 py-2 rounded-lg bg-action-blue/20 text-action-blue-text border border-action-blue/50 hover:bg-action-blue/30 transition-all text-sm font-semibold flex items-center gap-2 glow-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🔬 {actionStates.analyze.status === 'loading' ? 'Analyzing…' : 'Analyze Prompt'}
              </button>

              {/* Attack */}
              <button
                onClick={handleAttack}
                disabled={isLoading}
                className="px-5 py-2 rounded-lg bg-warning-orange/20 text-orange-300 border border-warning-orange/50 hover:bg-warning-orange/30 transition-all text-sm font-semibold flex items-center gap-2 glow-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ⚡ {actionStates.attack.status === 'loading' ? 'Testing…' : 'Attack Mode'}
              </button>

              {/* Generate Fixed Prompt */}
              <button
                onClick={handleHeal}
                disabled={isLoading || !analysisResult}
                className="px-5 py-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/40 hover:bg-secondary/20 transition-all text-sm font-semibold flex items-center gap-2 glow-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ✦ {actionStates.heal.status === 'loading' ? 'Healing…' : 'Generate Fixed Prompt'}
              </button>
            </div>

            {/* Heal & Verify — primary CTA */}
            <button
              onClick={handleHealVerify}
              disabled={isLoading || !analysisResult || !originalAttackResults}
              className="px-8 py-3 rounded-lg bg-primary text-on-primary font-bold hover:bg-primary-container hover:text-on-primary-container transition-all text-sm flex items-center gap-2 glow-primary glow-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✕ {actionStates.healVerify.status === 'loading' ? 'Verifying…' : 'Improve & Verify'}
            </button>
          </div>

          {/* ── Status messages ────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {renderStatus('analyze',    'Prompt analysis completed.')}
            {renderStatus('attack',     'Attack mode completed.')}
            {renderStatus('heal',       'Improved prompt generated.')}
            {renderStatus('retest',     'Re-test completed.')}
            {renderStatus('healVerify', 'Prompt healed and verified with Vertex AI text streaming.')}
          </div>

          {/* ── Config + Pipeline ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
            {/* Iteration control */}
            <div className="glass-panel p-6 rounded-xl flex flex-col justify-center">
              <label className="text-xs font-mono text-on-surface-variant mb-3 block uppercase tracking-widest">
                Max Healing Iterations
              </label>
              <div className="relative mb-2">
                <select
                  value={maxHealingIterations}
                  onChange={(e) => setMaxHealingIterations(Math.min(5, Number(e.target.value)))}
                  className="w-full bg-surface-deep border border-outline-variant rounded-lg py-2 pl-4 pr-10 text-sm font-mono text-on-surface focus:ring-1 focus:ring-primary focus:border-primary appearance-none inner-shadow"
                >
                  {[1, 2, 3, 5].map((v) => <option key={v} value={v}>{v === 5 ? `${v} Iterations (Max)` : `${v} Iteration${v > 1 ? 's' : ''}`}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-on-surface-variant">▾</div>
              </div>
              <p className="text-xs font-mono text-outline">Stateless execution via Vertex AI Streaming</p>
            </div>

            {/* Pipeline status */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-xl">
              <h3 className="text-xs font-mono text-on-surface-variant mb-5 uppercase tracking-widest">Pipeline Status</h3>
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-4 w-full h-px bg-surface-container-highest -z-10" />
                <PipelineNode label="Analysis"     actionKey="analyze" />
                <PipelineNode label="Attack"       actionKey="attack" />
                <PipelineNode label="Generation"   actionKey="heal" />
                <PipelineNode label="Verification" actionKey="healVerify" />
              </div>
            </div>
          </div>

          {/* ── Tab Content Area ───────────────────────────── */}
          <div className="glass-panel rounded-xl overflow-hidden border border-primary/20">
            {/* Tab content header */}
            <div className="bg-surface-container-low px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
                <span className="text-primary">&lt;/&gt;</span>
                {sidebarNav.find((n) => n.tab === activeTab)?.label ?? 'Workspace'}
              </h2>
              {/* Mobile tab switcher */}
              <div className="flex md:hidden gap-1 flex-wrap">
                {sidebarNav.map(({ tab, icon }) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`p-1.5 rounded text-sm transition-colors ${activeTab === tab ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">

              {/* ══ INPUT TAB ══════════════════════════════ */}
              {activeTab === 'input' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Prompt Pack Input</h2>
                    <button
                      onClick={() => setPromptPack(SAMPLE_WEAK_PROMPT)}
                      className="px-4 py-1.5 rounded-lg border border-white/10 text-on-surface-variant hover:border-primary hover:text-primary transition-all text-sm"
                    >
                      Load Sample Prompt
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PromptField fieldKey="systemPrompt"         label="System Prompt" />
                    <PromptField fieldKey="developerPrompt"      label="Developer Prompt" />
                    <PromptField fieldKey="toolUseInstructions"  label="Tool Use Instructions" />
                    <PromptField fieldKey="fallbackBehavior"     label="Fallback Behavior" />
                    <PromptField fieldKey="escalationRules"      label="Escalation Rules" />
                    <PromptField fieldKey="confirmationRules"    label="Confirmation Rules" />
                    <PromptField fieldKey="refusalRedirectRules" label="Refusal / Redirect Rules" />
                    <PromptField fieldKey="agentBoundaries"      label="Agent Boundaries" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleAnalyze} disabled={isLoading}
                      className="px-6 py-2 rounded-lg bg-action-blue/20 text-action-blue-text border border-action-blue/50 hover:bg-action-blue/30 text-sm font-semibold disabled:opacity-40 transition-all">
                      🔬 {actionStates.analyze.status === 'loading' ? 'Analyzing…' : 'Run Analysis'}
                    </button>
                    <button onClick={handleAttack} disabled={isLoading}
                      className="px-6 py-2 rounded-lg bg-warning-orange/20 text-orange-300 border border-warning-orange/50 hover:bg-warning-orange/30 text-sm font-semibold disabled:opacity-40 transition-all">
                      ⚡ {actionStates.attack.status === 'loading' ? 'Testing…' : 'Run Attack'}
                    </button>
                  </div>
                </div>
              )}

              {/* ══ ANALYZE TAB ════════════════════════════ */}
              {activeTab === 'analyze' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Analysis Results</h2>
                    <button onClick={handleAnalyze} disabled={isLoading}
                      className="px-4 py-1.5 rounded-lg bg-action-blue/20 text-action-blue-text border border-action-blue/50 hover:bg-action-blue/30 text-sm font-semibold disabled:opacity-40 transition-all">
                      {actionStates.analyze.status === 'loading' ? 'Analyzing…' : '↺ Re-run'}
                    </button>
                  </div>
                  {renderStatus('analyze', 'Prompt analysis completed.')}
                  {analysisResult ? (
                    <div className="space-y-4">
                      {/* Score breakdown */}
                      <div className="glass-panel rounded-xl p-6">
                        <h3 className="text-sm font-mono text-on-surface-variant mb-4 uppercase tracking-widest">Reliability Score</h3>
                        <div className="flex items-end gap-6 mb-6">
                          <div className="text-5xl font-black text-secondary text-glow-secondary">{analysisResult.reliabilityScore.overall}</div>
                          <span className="text-on-surface-variant text-sm mb-2">/100</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {Object.entries(analysisResult.reliabilityScore.categories).map(([k, v]) => (
                            <div key={k} className="bg-surface-container rounded-lg p-3">
                              <div className="text-xs font-mono text-on-surface-variant mb-1 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                              <div className={`text-xl font-bold ${Number(v) >= 70 ? 'text-secondary' : Number(v) >= 40 ? 'text-warning-orange' : 'text-critical-error'}`}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Summary row */}
                      <div className="grid grid-cols-5 gap-3">
                        {[
                          { label: 'Critical', val: analysisResult.summary.criticalCount, color: 'text-critical-error' },
                          { label: 'High',     val: analysisResult.summary.highCount,     color: 'text-orange-400' },
                          { label: 'Medium',   val: analysisResult.summary.mediumCount,   color: 'text-yellow-400' },
                          { label: 'Low',      val: analysisResult.summary.lowCount,      color: 'text-blue-400' },
                          { label: 'Info',     val: analysisResult.summary.informationalCount, color: 'text-on-surface-variant' },
                        ].map(({ label, val, color }) => (
                          <div key={label} className="glass-panel rounded-lg p-3 text-center">
                            <div className={`text-2xl font-bold ${color}`}>{val}</div>
                            <div className="text-xs font-mono text-on-surface-variant mt-1">{label}</div>
                          </div>
                        ))}
                      </div>
                      {/* Issues list */}
                      <div className="space-y-3">
                        {analysisResult.issues.map((issue) => (
                          <div key={issue.id} className="border border-outline-variant/50 rounded-xl p-4 bg-surface-container hover:border-primary/30 transition-colors">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className="font-semibold text-on-surface">{issue.title}</h4>
                              <SeverityBadge severity={issue.severity} />
                            </div>
                            <p className="text-sm text-on-surface-variant mb-2">{issue.explanation}</p>
                            <p className="text-sm text-secondary/80">
                              <span className="font-mono text-secondary">→</span> {issue.recommendedFix}
                            </p>
                            <div className="mt-2 text-xs font-mono text-outline">
                              {issue.affectedSection} · {issue.category} · confidence {issue.confidence}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-on-surface-variant">
                      <div className="text-4xl mb-4">🔬</div>
                      <p>Run Analyze Prompt to see results</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ ATTACK TAB ═════════════════════════════ */}
              {activeTab === 'attack' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Attack Mode Results</h2>
                    <button onClick={handleAttack} disabled={isLoading || selectedProfiles.length === 0}
                      className="px-4 py-1.5 rounded-lg bg-warning-orange/20 text-orange-300 border border-warning-orange/50 hover:bg-warning-orange/30 text-sm font-semibold disabled:opacity-40 transition-all">
                      {actionStates.attack.status === 'loading' ? 'Testing…' : '↺ Re-run Attack'}
                    </button>
                  </div>

                  {/* ── Attack Configuration Panel ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-on-surface-variant uppercase tracking-widest">Simulation Profiles</span>
                      <span className="text-xs font-mono text-outline">{selectedProfiles.length === 0 ? 'Select at least one profile' : `${selectedProfiles.length} of 3 active`}</span>
                    </div>

                    {/* Profile cards — each shows all contained test IDs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {([
                        {
                          key: 'context-identity',
                          label: 'Context & Identity',
                          accent: 'border-primary/50 bg-primary/5',
                          accentActive: 'border-primary bg-primary/10',
                          dot: 'bg-primary',
                          header: 'text-primary',
                          ids: [
                            { id: 'PI-001', name: 'Prompt Injection' },
                            { id: 'SE-001', name: 'Social Engineering' },
                            { id: 'EF-001', name: 'Escalation Failure' },
                            { id: 'RF-001', name: 'Recovery Failure' },
                          ],
                        },
                        {
                          key: 'system-boundaries',
                          label: 'System Boundaries',
                          accent: 'border-action-blue-text/50 bg-action-blue-text/5',
                          accentActive: 'border-action-blue-text bg-action-blue-text/10',
                          dot: 'bg-action-blue-text',
                          header: 'text-action-blue-text',
                          ids: [
                            { id: 'DL-001', name: 'Data Leakage' },
                            { id: 'HR-001', name: 'Hallucination Risks' },
                            { id: 'IL-001', name: 'Instruction Leakage' },
                            { id: 'UR-001', name: 'Unsupported Requests' },
                            { id: 'AR-001', name: 'Ambiguous Requests' },
                          ],
                        },
                        {
                          key: 'tool-exploitation',
                          label: 'Tool Exploitation',
                          accent: 'border-warning-orange/50 bg-warning-orange/5',
                          accentActive: 'border-warning-orange bg-warning-orange/10',
                          dot: 'bg-warning-orange',
                          header: 'text-orange-300',
                          ids: [
                            { id: 'JB-001', name: 'Jailbreak' },
                            { id: 'TM-001', name: 'Tool Misuse' },
                            { id: 'MC-001', name: 'Missing Confirmation' },
                            { id: 'UE-001', name: 'Unsafe Execution' },
                            { id: 'OS-001', name: 'Over-Sharing' },
                          ],
                        },
                      ] as const).map(({ key, label, accent, accentActive, dot, header, ids }) => {
                        const active = selectedProfiles.includes(key);
                        return (
                          <button key={key} onClick={() => toggleProfile(key)} className={`text-left rounded-xl border p-4 transition-all ${active ? accentActive : `${accent} opacity-60 hover:opacity-90`}`}>
                            {/* Profile header */}
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${active ? dot : 'bg-outline-variant'}`} />
                              <span className={`text-sm font-bold ${active ? header : 'text-on-surface-variant'}`}>{label}</span>
                            </div>
                            {/* Test IDs list */}
                            <ul className="space-y-1.5">
                              {ids.map(({ id, name }) => (
                                <li key={id} className="flex items-center gap-2">
                                  <span className={`text-xs font-mono font-bold w-14 shrink-0 ${active ? header : 'text-outline'}`}>{id}</span>
                                  <span className="text-xs text-on-surface-variant">{name}</span>
                                </li>
                              ))}
                            </ul>
                          </button>
                        );
                      })}
                    </div>

                    {/* Volume slider + Live Probe toggle */}
                    <div className="glass-panel rounded-xl px-4 py-3 space-y-3">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-on-surface-variant uppercase tracking-widest shrink-0">Attack Volume</span>
                        <input type="range" min={4} max={20} step={2} value={attackVolume}
                          onChange={(e) => setAttackVolume(Number(e.target.value))}
                          className="flex-1 accent-warning-orange cursor-pointer" />
                        <span className="text-sm font-mono font-bold text-orange-300 shrink-0">{attackVolume} tests</span>
                      </div>
                      <div className="border-t border-outline-variant/20 pt-3 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setLiveProbe((v) => !v)}
                              className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${liveProbe ? 'bg-secondary' : 'bg-outline-variant'}`}>
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${liveProbe ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                            <span className={`text-sm font-semibold ${liveProbe ? 'text-secondary' : 'text-on-surface-variant'}`}>Live Agent Probe</span>
                            {liveProbe && <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/30">REAL EVIDENCE</span>}
                          </div>
                          <p className="text-xs font-mono text-outline mt-1 ml-12">
                            {liveProbe
                              ? `Fires each attack at a real Vertex AI agent · captures actual response · evaluates real evidence · ~${Math.round(attackVolume * 0.35 * attackTurns)} min`
                              : 'Off — Gemini predicts agent behavior without invoking a live agent'}
                          </p>
                          {liveProbe && (
                            <div className="flex items-center gap-3 mt-3 ml-12">
                              <span className="text-xs font-mono text-on-surface-variant shrink-0">Attack Turns</span>
                              <div className="flex gap-1">
                                {[1, 2, 3].map((t) => (
                                  <button key={t} onClick={() => setAttackTurns(t)}
                                    className={`w-8 h-8 rounded-lg text-xs font-mono font-bold border transition-all ${attackTurns === t ? 'bg-secondary text-on-secondary border-secondary' : 'border-outline-variant text-on-surface-variant hover:border-secondary/50'}`}>
                                    {t}
                                  </button>
                                ))}
                              </div>
                              <span className="text-xs font-mono text-outline">
                                {attackTurns === 1 ? 'Single message per attack' : attackTurns === 2 ? 'Setup → attack' : 'Setup → context → attack'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {renderStatus('attack', 'Attack mode completed.')}
                  {originalAttackResults ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: 'Total Tests', val: originalAttackResults.summary.totalTests, color: 'text-on-surface' },
                          { label: 'Passed',      val: originalAttackResults.summary.passed,     color: 'text-secondary' },
                          { label: 'Failed',      val: originalAttackResults.summary.failed,     color: 'text-critical-error' },
                        ].map(({ label, val, color }) => (
                          <div key={label} className="glass-panel rounded-xl p-4 text-center">
                            <div className={`text-3xl font-black ${color}`}>{val}</div>
                            <div className="text-xs font-mono text-on-surface-variant mt-1">{label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {originalAttackResults.scenarios.map((scenario) => {
                          const s = scenario;
                            const cardId = `atk-${s.id}`;
                            const isOpen = expandedCards.has(cardId);
                            const hasTranscript = Array.isArray(s.transcript) && s.transcript.length > 0;
                            const actualBehavior = s.actualOrLikelyBehavior || s.likelyBehavior;
                            return (
                              <div key={s.id} className={`border rounded-xl p-4 ${s.passed ? 'border-secondary/30 bg-secondary/5' : 'border-critical-error/30 bg-critical-error/5'}`}>
                                <div className="flex items-start justify-between mb-2 gap-3">
                                  <div>
                                    <span className="text-xs font-mono text-on-surface-variant">{s.id}</span>
                                    <h4 className="font-semibold text-on-surface">{s.scenarioName || s.category}</h4>
                                  </div>
                                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-mono font-bold ${s.passed ? 'bg-secondary/20 text-secondary border border-secondary/40' : 'bg-critical-error/20 text-critical-error border border-critical-error/40'}`}>
                                    {s.passed ? 'PASSED' : 'FAILED'}
                                  </span>
                                </div>
                                <div className="space-y-1.5 text-xs font-mono">
                                  <p className="text-on-surface-variant"><span className="text-outline">Input:</span> {s.simulatedInput}</p>
                                  <p className="text-on-surface-variant"><span className="text-outline">Expected:</span> {s.expectedBehavior}</p>
                                </div>
                                {/* Predicted / actual agent response — prominent block */}
                                {(actualBehavior || (s.agentResponse && s.agentResponse !== 'Evaluation error.')) && (
                                  <div className={`mt-3 rounded-lg border px-3 py-2.5 ${s.passed ? 'border-secondary/30 bg-secondary/5' : 'border-warning-orange/30 bg-warning-orange/5'}`}>
                                    <div className={`text-xs font-mono font-bold uppercase tracking-widest mb-1.5 ${s.passed ? 'text-secondary' : 'text-warning-orange'}`}>
                                      {s.agentResponse && s.agentResponse !== 'Evaluation error.' ? 'Agent Response' : 'Predicted Agent Response'}
                                    </div>
                                    <p className="text-xs font-mono text-on-surface-variant whitespace-pre-wrap">
                                      {s.agentResponse && s.agentResponse !== 'Evaluation error.' ? s.agentResponse : actualBehavior}
                                    </p>
                                  </div>
                                )}
                                {!s.passed && (
                                  <div className="mt-2 space-y-1 text-xs font-mono">
                                    <p className="text-critical-error/80"><span className="font-bold">Failure:</span> {s.failureReason}</p>
                                    <p className="text-action-blue-text"><span className="font-bold">Defense:</span> {s.recommendedDefense}</p>
                                  </div>
                                )}
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                  <SeverityBadge severity={s.severity} />
                                  <span className="text-xs font-mono text-outline">confidence {s.confidence}%</span>
                                  {s.id.startsWith('HF-CORPUS') && (
                                    <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-action-blue-text/10 text-action-blue-text border border-action-blue-text/30">HF Corpus</span>
                                  )}
                                  {hasTranscript && (
                                    <button onClick={() => toggleCard(cardId)} className="ml-auto text-xs font-mono text-primary/70 hover:text-primary underline underline-offset-2 transition-colors">
                                      {isOpen ? '▲ Hide transcript' : '▼ Show transcript'}
                                    </button>
                                  )}
                                </div>
                                {isOpen && hasTranscript && (
                                  <div className="mt-3 border border-outline-variant/40 rounded-lg overflow-hidden">
                                    <div className="bg-surface-container-low px-3 py-1.5 text-xs font-mono text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/40 flex items-center justify-between">
                                      <span>Transcript</span>
                                      {s.transcript && s.transcript.filter(t => t.role === 'user').length > 1 && (
                                        <span className="text-secondary normal-case">{s.transcript.filter(t => t.role === 'user').length}-turn attack</span>
                                      )}
                                    </div>
                                    <div className="divide-y divide-outline-variant/20 max-h-64 overflow-y-auto">
                                      {(s.transcript ?? []).map((entry, i) => (
                                        <div key={i} className={`px-3 py-2 text-xs font-mono ${entry.role === 'user' ? 'bg-surface-deep' : entry.role === 'system' ? 'bg-primary/5' : 'bg-surface-container'}`}>
                                          <span className={`font-bold mr-2 ${entry.role === 'user' ? 'text-action-blue-text' : entry.role === 'system' ? 'text-primary' : 'text-secondary'}`}>{entry.role.toUpperCase()}</span>
                                          <span className="text-on-surface-variant whitespace-pre-wrap">{entry.content}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-on-surface-variant">
                      <div className="text-4xl mb-4">⚡</div>
                      <p>Run Attack Mode to see results</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ HEAL TAB ════════════════════════════════ */}
              {activeTab === 'heal' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Self-Improve — Improved Prompt</h2>
                    <button onClick={handleHeal} disabled={isLoading || !analysisResult}
                      className="px-4 py-1.5 rounded-lg bg-secondary/10 text-secondary border border-secondary/40 hover:bg-secondary/20 text-sm font-semibold disabled:opacity-40 transition-all">
                      {actionStates.heal.status === 'loading' ? 'Healing…' : '↺ Re-generate'}
                    </button>
                  </div>
                  {renderStatus('heal', 'Improved prompt generated.')}
                  {healedPrompt ? (
                    <div className="space-y-4">
                      {/* Improvements */}
                      <div className="border border-secondary/30 bg-secondary/5 rounded-xl p-4">
                        <h3 className="text-sm font-mono text-secondary mb-3 uppercase tracking-widest">Improvements Made</h3>
                        <div className="space-y-2">
                          {healedPrompt.improvements.map((imp, idx) => (
                            <div key={idx}>
                              <div className="text-xs font-mono text-secondary/70 uppercase mb-1">{imp.section}</div>
                              <ul className="space-y-0.5">
                                {imp.changes.map((c, ci) => (
                                  <li key={ci} className="text-sm text-on-surface-variant flex gap-2">
                                    <span className="text-secondary shrink-0">→</span>{c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Prompt sections */}
                      <div className="space-y-3">
                        {promptSections.map(({ key, label }) => (
                          <div key={key}>
                            <div className="text-xs font-mono text-on-surface-variant mb-1 uppercase tracking-widest">{label}</div>
                            <pre className="bg-surface-deep inner-shadow border border-outline-variant rounded-lg p-4 text-xs font-mono text-on-surface-variant whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {healedPrompt[key]}
                            </pre>
                          </div>
                        ))}
                      </div>
                      {/* Re-test button */}
                      <div className="flex justify-end pt-2">
                        <button onClick={handleRetest} disabled={isLoading || !originalAttackResults}
                          className="px-6 py-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 text-sm font-semibold disabled:opacity-40 transition-all glow-accent">
                          {actionStates.retest.status === 'loading' ? 'Re-testing…' : '→ Re-Test Improved Prompt'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-on-surface-variant">
                      <div className="text-4xl mb-4">✦</div>
                      <p>Run Analyze first, then click Generate Fixed Prompt</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ VERIFY TAB ═════════════════════════════ */}
              {activeTab === 'verify' && (
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold">Verify Improvement</h2>
                      <p className="text-sm text-on-surface-variant mt-1">Re-heal and re-test the same original attack scenarios using stateless Vertex AI text streaming.</p>
                    </div>
                    <span className="shrink-0 text-xs font-mono text-primary bg-primary/10 border border-primary/30 px-3 py-1 rounded-full">Verified with Vertex AI text streaming</span>
                  </div>
                  {renderStatus('healVerify', 'Prompt healed and verified with Vertex AI text streaming.')}

                  {/* Inline Heal & Verify controls */}
                  <div className="glass-panel rounded-xl p-5 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-mono text-on-surface-variant uppercase tracking-widest">Iterations</label>
                      <div className="relative">
                        <select value={maxHealingIterations} onChange={(e) => setMaxHealingIterations(Math.min(5, Number(e.target.value)))}
                          className="bg-surface-deep border border-outline-variant rounded-lg py-1.5 pl-3 pr-8 text-sm font-mono text-on-surface appearance-none inner-shadow focus:border-primary">
                          {[1,2,3,5].map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-on-surface-variant text-xs">▾</div>
                      </div>
                    </div>
                    <button onClick={handleHealVerify} disabled={isLoading || !analysisResult || !originalAttackResults}
                      className="px-6 py-2 rounded-lg bg-primary text-on-primary font-bold hover:bg-primary-container hover:text-on-primary-container transition-all text-sm disabled:opacity-40 glow-primary glow-accent">
                      {actionStates.healVerify.status === 'loading' ? 'Verifying…' : '✕ Improve & Verify'}
                    </button>
                    <p className="text-xs font-mono text-outline">AgentFix heals and re-tests until all attacks pass or limit is reached.</p>
                  </div>

                  {healVerifyResult ? (
                    <div className="space-y-6">
                      {/* Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                          { label: 'Before Failed',  val: healVerifyResult.originalFailedCount, color: 'text-critical-error' },
                          { label: 'After Failed',   val: healVerifyResult.finalFailedCount,    color: 'text-secondary' },
                          { label: 'Reduction',      val: `${healVerifyResult.vulnerabilityReduction}%`, color: 'text-action-blue-text' },
                          { label: 'Reliability',    val: `${healVerifyResult.reliabilityBefore}→${healVerifyResult.reliabilityAfter}`, color: 'text-on-surface' },
                          { label: 'Iterations',     val: healVerifyResult.iterations.length,   color: 'text-primary' },
                        ].map(({ label, val, color }) => (
                          <div key={label} className="glass-panel rounded-xl p-4 text-center">
                            <div className={`text-2xl font-black ${color}`}>{val}</div>
                            <div className="text-xs font-mono text-on-surface-variant mt-1">{label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Stopped reason */}
                      <div className="border border-outline-variant rounded-xl p-4 bg-surface-container">
                        <span className="text-xs font-mono text-on-surface-variant uppercase tracking-widest">Stopped: </span>
                        <span className="text-sm font-mono text-on-surface">{healVerifyResult.stoppedReason.replaceAll('_', ' ')}</span>
                      </div>

                      {/* Iteration timeline */}
                      <div className="border border-outline-variant rounded-xl p-5 bg-surface-container">
                        <h3 className="text-sm font-mono text-on-surface-variant mb-4 uppercase tracking-widest">Iteration Timeline</h3>
                        <div className="space-y-3">
                          {healVerifyResult.iterations.map((it) => (
                            <div key={it.iteration} className="border border-outline-variant/50 rounded-xl p-4 bg-surface-container-high">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <h4 className="font-semibold text-on-surface">Iteration {it.iteration}</h4>
                                <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-full">
                                  Re-tested · streamGenerateContent
                                </span>
                              </div>
                              <p className="text-sm text-on-surface-variant">{it.summary}</p>
                              <p className="text-xs font-mono text-outline mt-2">
                                {it.passedCount}/{it.attackResults.length} passed · reliability {it.reliabilityScore}/100 · reduction {it.vulnerabilityReduction}%
                              </p>
                              {it.changesMade.length > 0 && (
                                <ul className="mt-3 space-y-1">
                                  {it.changesMade.map((c, i) => (
                                    <li key={i} className="text-xs font-mono text-on-surface-variant">
                                      <span className="text-secondary">{c.section}:</span> {c.change}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Remaining failures */}
                      {healVerifyResult.remainingFailures.length > 0 && (
                        <div className="border border-critical-error/30 rounded-xl p-5 bg-critical-error/5">
                          <h3 className="text-sm font-mono text-critical-error mb-3 uppercase tracking-widest">Remaining Failed Attacks</h3>
                          <div className="space-y-3">
                            {healVerifyResult.remainingFailures.map((f) => {
                              const cardId = `rem-${f.id}`;
                              const isOpen = expandedCards.has(cardId);
                              const hasTranscript = Array.isArray(f.transcript) && f.transcript.length > 0;
                              return (
                                <div key={f.id} className="bg-surface border border-critical-error/20 rounded-lg p-3">
                                  <div className="font-medium text-on-surface">{f.scenarioName}</div>
                                  <div className="space-y-1 mt-1 text-xs font-mono">
                                    <p className="text-on-surface-variant"><span className="text-outline">Input:</span> {f.simulatedUserInput}</p>
                                    {f.actualOrLikelyBehavior && <p className="text-warning-orange/80"><span className="text-outline">Actual:</span> {f.actualOrLikelyBehavior}</p>}
                                    {f.agentResponse && f.agentResponse !== 'Evaluation error.' && <p className="text-on-surface-variant"><span className="text-outline">Response:</span> {f.agentResponse}</p>}
                                    <p className="text-critical-error/80 mt-1">{f.failureReason}</p>
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <SeverityBadge severity={f.severity} />
                                    <span className="text-xs font-mono text-outline">confidence {f.confidence}%</span>
                                    {hasTranscript && (
                                      <button onClick={() => toggleCard(cardId)} className="ml-auto text-xs font-mono text-primary/70 hover:text-primary underline underline-offset-2 transition-colors">
                                        {isOpen ? '▲ Hide transcript' : '▼ Show transcript'}
                                      </button>
                                    )}
                                  </div>
                                  {isOpen && hasTranscript && (
                                    <div className="mt-2 border border-outline-variant/40 rounded-lg overflow-hidden">
                                      <div className="divide-y divide-outline-variant/20 max-h-48 overflow-y-auto">
                                        {(f.transcript ?? []).map((entry, i) => (
                                          <div key={i} className={`px-3 py-2 text-xs font-mono ${entry.role === 'user' ? 'bg-surface-deep' : 'bg-surface-container'}`}>
                                            <span className={`font-bold mr-2 ${entry.role === 'user' ? 'text-action-blue-text' : 'text-secondary'}`}>{entry.role.toUpperCase()}</span>
                                            <span className="text-on-surface-variant whitespace-pre-wrap">{entry.content}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Final verified prompt */}
                      <div className="border border-primary/20 rounded-xl overflow-hidden">
                        <div className="bg-surface-container-low px-5 py-3 border-b border-white/10 flex items-center justify-between">
                          <h3 className="font-semibold text-on-surface flex items-center gap-2"><span className="text-primary">&lt;/&gt;</span> Final Verified Prompt</h3>
                          <button onClick={() => copyToClipboard(JSON.stringify(healVerifyResult.finalPromptPack, null, 2))}
                            className="px-3 py-1.5 bg-surface-container text-on-surface-variant hover:text-primary border border-outline-variant rounded text-xs font-mono transition-colors">
                            📋 Copy JSON
                          </button>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {promptSections.map(({ key, label }) => (
                            <div key={key} className="border border-outline-variant rounded-lg p-3">
                              <h4 className="text-xs font-mono text-on-surface-variant uppercase tracking-widest mb-2">{label}</h4>
                              <pre className="text-xs font-mono text-on-surface-variant whitespace-pre-wrap max-h-40 overflow-y-auto">{healVerifyResult.finalPromptPack[key]}</pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-on-surface-variant">
                      <div className="text-4xl mb-4">✕</div>
                      <p>Run Attack Mode, then click Improve & Verify to run the verification loop.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ COMPARE TAB ════════════════════════════ */}
              {activeTab === 'compare' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Before vs After Comparison</h2>
                  {renderStatus('retest', 'Re-test completed.')}
                  {finalPromptForComparison && promptPack ? (
                    <div className="space-y-6">
                      {/* Score comparison */}
                      <div className="border border-action-blue/30 bg-action-blue/5 rounded-xl p-5">
                        <h3 className="text-sm font-mono text-action-blue-text mb-4 uppercase tracking-widest">Reliability Score Improvement</h3>
                        <div className="flex items-center gap-8 flex-wrap">
                          <div>
                            <div className="text-xs font-mono text-on-surface-variant mb-1">Before</div>
                            <div className="text-4xl font-black text-critical-error">{baselineScore}/100</div>
                          </div>
                          <div className="text-2xl text-on-surface-variant">→</div>
                          <div>
                            <div className="text-xs font-mono text-on-surface-variant mb-1">After Re-Test</div>
                            <div className="text-4xl font-black text-secondary">
                              {healedAttackResults || healVerifyResult ? `${healedScore}/100` : '--/100'}
                            </div>
                          </div>
                          <div className="ml-auto">
                            <div className="text-xs font-mono text-on-surface-variant mb-1">Vulnerability Reduction</div>
                            <div className="text-3xl font-black text-action-blue-text">
                              {healedAttackResults || healVerifyResult ? `${vulnerabilityReduction}%` : '--'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Attack results table */}
                      {originalAttackResults && healedAttackResults && (
                        <div className="border border-outline-variant rounded-xl p-5 bg-surface-container">
                          <h3 className="text-sm font-mono text-on-surface-variant mb-4 uppercase tracking-widest">Re-Test Results</h3>
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            {[
                              { label: 'Original Failed', val: originalFailedCount,  color: 'text-critical-error' },
                              { label: 'Healed Failed',   val: healedFailedCount,    color: 'text-secondary' },
                              { label: 'Reduction',       val: `${vulnerabilityReduction}%`, color: 'text-action-blue-text' },
                            ].map(({ label, val, color }) => (
                              <div key={label} className="glass-panel rounded-xl p-4 text-center">
                                <div className={`text-2xl font-black ${color}`}>{val}</div>
                                <div className="text-xs font-mono text-on-surface-variant mt-1">{label}</div>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-2">
                            {originalAttackResults.scenarios.map((orig) => {
                              const healed = healedAttackResults.scenarios.find((s) => s.id === orig.id);
                              return (
                                <div key={orig.id} className="border border-outline-variant/50 rounded-lg p-4 bg-surface-container-high">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-on-surface">{orig.scenarioName || orig.category}</h4>
                                      <p className="text-xs font-mono text-on-surface-variant mt-1 truncate">{orig.simulatedInput}</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${orig.passed ? 'bg-secondary/20 text-secondary border border-secondary/40' : 'bg-critical-error/20 text-critical-error border border-critical-error/40'}`}>
                                        Before: {orig.passed ? 'PASS' : 'FAIL'}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${healed?.passed ? 'bg-secondary/20 text-secondary border border-secondary/40' : 'bg-critical-error/20 text-critical-error border border-critical-error/40'}`}>
                                        After: {healed?.passed ? 'PASS' : 'FAIL'}
                                      </span>
                                    </div>
                                  </div>
                                  {healed && !healed.passed && (
                                    <p className="text-xs font-mono text-critical-error/80 mt-2">Remaining: {healed.failureReason}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Re-test CTA if not done */}
                      {healedPrompt && !healedAttackResults && (
                        <div className="border border-primary/30 bg-primary/5 rounded-xl p-5 flex items-center justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-primary">Re-test improved prompt</h3>
                            <p className="text-sm text-on-surface-variant">Run the original attack scenarios against the healed prompt.</p>
                          </div>
                          <button onClick={handleRetest} disabled={isLoading || !originalAttackResults}
                            className="px-5 py-2 rounded-lg bg-primary text-on-primary font-bold hover:bg-primary-container hover:text-on-primary-container text-sm disabled:opacity-40 glow-primary transition-all">
                            {actionStates.retest.status === 'loading' ? 'Re-testing…' : '→ Re-Test'}
                          </button>
                        </div>
                      )}

                      {/* Prompt diff sections */}
                      <div className="space-y-4">
                        {promptSections.map(({ key, label }) => {
                          const sectionChanges = healVerifyResult?.iterations
                            .flatMap((it) => it.changesMade)
                            .filter((c) => c.section === key) || [];
                          return (
                            <div key={key} className="border border-outline-variant rounded-xl p-4">
                              <h3 className="font-semibold text-on-surface mb-3">{label}</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-xs font-mono text-critical-error mb-1 uppercase">Original</div>
                                  <pre className="bg-red-950/20 border border-critical-error/20 rounded-lg p-3 h-48 overflow-y-auto text-xs font-mono text-on-surface-variant whitespace-pre-wrap">{promptPack[key]}</pre>
                                </div>
                                <div>
                                  <div className="text-xs font-mono text-secondary mb-1 uppercase">Final Verified</div>
                                  <pre className="bg-green-950/20 border border-secondary/20 rounded-lg p-3 h-48 overflow-y-auto text-xs font-mono text-on-surface-variant whitespace-pre-wrap">{finalPromptForComparison[key]}</pre>
                                </div>
                              </div>
                              <div className="mt-3 bg-surface-container border border-outline-variant rounded-lg p-3 text-xs font-mono text-on-surface-variant">
                                <div className="text-on-surface font-semibold mb-1">Why it changed</div>
                                {sectionChanges.length > 0
                                  ? sectionChanges.map((c, i) => (
                                    <div key={i}><span className="text-secondary">{c.change}</span> — {c.reason}{c.relatedFailedAttack ? ` (attack: ${c.relatedFailedAttack})` : ''}</div>
                                  ))
                                  : <span className="text-outline">No recorded verification change for this section.</span>
                                }
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Key changes summary */}
                      {(healedPrompt?.improvements?.length ?? 0) > 0 && (
                        <div className="glass-panel rounded-xl p-5">
                          <h3 className="text-sm font-mono text-on-surface-variant mb-3 uppercase tracking-widest">Key Changes Summary</h3>
                          <ul className="space-y-2">
                            {healedPrompt?.improvements?.map((imp, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-secondary shrink-0 mt-0.5">✓</span>
                                <span><span className="font-semibold text-on-surface">{imp.section}:</span> <span className="text-on-surface-variant">{imp.changes.join(', ')}</span></span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-on-surface-variant">
                      <div className="text-4xl mb-4">⇄</div>
                      <p>Generate fixed prompt first to see comparison</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ ASK AI TAB ══════════════════════════════ */}
              {activeTab === 'ask' && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold">Ask AI About Your Prompt</h2>
                  {renderStatus('ask', 'Question answered.')}
                  {/* Chat messages */}
                  <div className="bg-surface-deep inner-shadow border border-outline-variant rounded-xl h-96 overflow-y-auto p-4">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-on-surface-variant text-center">
                        <div className="text-4xl mb-4">💬</div>
                        <p className="mb-3 font-medium">Ask questions about your prompt analysis</p>
                        <div className="text-sm space-y-1 text-outline font-mono">
                          <p>— Why did this prompt fail Attack Mode?</p>
                          <p>— What changed in the improved prompt?</p>
                          <p>— How can I improve fallback behavior?</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-xl p-3 text-sm font-mono ${
                              msg.role === 'user'
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container border border-outline-variant text-on-surface'
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Input row */}
                  <div className="flex gap-2">
                    <input
                      type="text" value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                      placeholder="Ask a question about your prompt…"
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 rounded-lg border border-outline-variant bg-surface-deep text-on-surface text-sm font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors disabled:opacity-50"
                    />
                    <button onClick={handleVoiceInput} disabled={isLoading || isListening}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isListening ? 'bg-critical-error text-on-error' : 'bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface'}`}>
                      {isListening ? '🔴 Listening…' : '🎙 Voice'}
                    </button>
                    <button onClick={handleAskQuestion} disabled={isLoading || !chatInput.trim()}
                      className="px-6 py-2 rounded-lg bg-primary text-on-primary font-bold hover:bg-primary-container hover:text-on-primary-container text-sm disabled:opacity-40 glow-primary transition-all">
                      {isLoading ? '…' : 'Ask'}
                    </button>
                  </div>
                </div>
              )}

              {/* ══ RESEARCH TAB ════════════════════════════ */}
              {activeTab === 'research' && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold">Prompt Research Mode</h2>
                  {renderStatus('research', 'Research guidance generated.')}
                  <div className="flex gap-2">
                    <input
                      type="text" value={researchTopic}
                      onChange={(e) => setResearchTopic(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                      placeholder="Enter a topic (e.g. 'prompt injection defense', 'confirmation rules')…"
                      disabled={isLoading}
                      className="flex-1 px-4 py-2 rounded-lg border border-outline-variant bg-surface-deep text-on-surface text-sm font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors disabled:opacity-50"
                    />
                    <button onClick={handleResearch} disabled={isLoading || !researchTopic.trim()}
                      className="px-6 py-2 rounded-lg bg-action-blue/20 text-action-blue-text border border-action-blue/50 hover:bg-action-blue/30 text-sm font-semibold disabled:opacity-40 transition-all">
                      {isLoading ? 'Researching…' : '🔬 Research'}
                    </button>
                  </div>
                  {researchResult ? (
                    <div className="space-y-4">
                      <div className="border border-action-blue/30 bg-action-blue/5 rounded-xl p-5">
                        <h3 className="text-sm font-mono text-action-blue-text mb-2 uppercase tracking-widest">Summary</h3>
                        <p className="text-sm text-on-surface-variant">{researchResult.summary}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-outline-variant rounded-xl p-5 bg-surface-container">
                          <h3 className="text-sm font-mono text-on-surface-variant mb-3 uppercase tracking-widest">Recommended Steps</h3>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-on-surface-variant">
                            {researchResult.recommendedSteps.map((step, i) => <li key={i}>{step}</li>)}
                          </ol>
                        </div>
                        <div className="border border-outline-variant rounded-xl p-5 bg-surface-container">
                          <h3 className="text-sm font-mono text-on-surface-variant mb-3 uppercase tracking-widest">Implementation Guidance</h3>
                          <p className="text-sm text-on-surface-variant">{researchResult.implementationGuidance}</p>
                        </div>
                      </div>
                      <div className="border border-secondary/30 bg-secondary/5 rounded-xl p-5">
                        <h3 className="text-sm font-mono text-secondary mb-3 uppercase tracking-widest">Suggested Prompt Wording</h3>
                        <ul className="space-y-2">
                          {researchResult.suggestedPromptWording.map((w, i) => (
                            <li key={i} className="text-sm font-mono text-on-surface-variant italic border-l-2 border-secondary/40 pl-3">{w}</li>
                          ))}
                        </ul>
                      </div>
                      {researchResult.warnings.length > 0 && (
                        <div className="border border-warning-orange/30 bg-warning-orange/5 rounded-xl p-5">
                          <h3 className="text-sm font-mono text-warning-orange mb-3 uppercase tracking-widest">⚠ Warnings</h3>
                          <ul className="list-disc list-inside space-y-1 text-sm text-on-surface-variant">
                            {researchResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-on-surface-variant">
                      <div className="text-4xl mb-4">🔬</div>
                      <p className="mb-3 font-medium">Research best practices for AI agent prompts</p>
                      <div className="text-xs font-mono text-outline space-y-1">
                        <p>— system prompt design</p>
                        <p>— tool-use instructions</p>
                        <p>— prompt injection defense</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ REPORT TAB ══════════════════════════════ */}
              {activeTab === 'report' && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold">Developer Report</h2>
                  {renderStatus('report', 'Developer report generated.')}
                  {!generatedReport ? (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-4">📄</div>
                      <p className="text-on-surface-variant mb-6">Generate a comprehensive Markdown report of your analysis</p>
                      <button
                        onClick={handleGenerateReport}
                        disabled={isLoading || !analysisResult || (!!healedPrompt && !healedAttackResults && !healVerifyResult)}
                        className="px-8 py-3 rounded-lg bg-primary text-on-primary font-bold hover:bg-primary-container hover:text-on-primary-container text-sm disabled:opacity-40 glow-primary glow-accent transition-all"
                      >
                        {isLoading ? 'Generating…' : '→ Generate Report'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2 justify-end">
                        <button onClick={handleCopyReport}
                          className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:text-on-surface hover:border-primary text-sm font-medium transition-all">
                          📋 Copy to Clipboard
                        </button>
                        <button onClick={handleDownloadReport}
                          className="px-4 py-2 rounded-lg bg-primary text-on-primary font-bold hover:bg-primary-container hover:text-on-primary-container text-sm transition-all">
                          ⬇ Download PDF
                        </button>
                        <button onClick={() => setGeneratedReport('')}
                          className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:text-critical-error hover:border-critical-error text-sm transition-all">
                          ↺ Re-generate
                        </button>
                      </div>
                      <div id="report-content" className="bg-surface-deep inner-shadow border border-outline-variant rounded-xl p-6 max-h-[600px] overflow-y-auto">
                        <div className="prose prose-invert prose-sm max-w-none text-on-surface-variant leading-relaxed">
                          {generatedReport.split('\n').map((line, i) => {
                            if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-on-surface mt-4 mb-2">{line.slice(2)}</h1>;
                            if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-primary mt-4 mb-2">{line.slice(3)}</h2>;
                            if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-secondary mt-3 mb-1">{line.slice(4)}</h3>;
                            if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-on-surface">{line.slice(2, -2)}</p>;
                            if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
                            if (line.startsWith('| ')) return <p key={i} className="font-mono text-xs border-b border-white/5 py-1">{line}</p>;
                            if (line.startsWith('---')) return <hr key={i} className="border-white/10 my-3" />;
                            if (line.trim() === '') return <br key={i} />;
                            return <p key={i} className="text-sm mb-1">{line}</p>;
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>{/* /p-6 */}
          </div>{/* /tab content area */}

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-white/5 flex items-center justify-between text-xs font-mono text-outline">
            <span>AgentFix Playground · Vertex AI Gemini 2.5 · streamGenerateContent</span>
            <span>Built with IBM Bob</span>
          </div>

        </main>
      </div>
    </div>
  );

  /* ── Report helpers (hoisted) ── */
  function handleCopyReport() {
    if (generatedReport) copyToClipboard(generatedReport).then((ok) => { if (ok) alert('Report copied!'); });
  }
  function handleDownloadReport() {
    if (!generatedReport) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AgentFix Report</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #111; line-height: 1.6; }
            h1 { font-size: 24px; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; }
            h2 { font-size: 20px; color: #7c3aed; margin-top: 28px; }
            h3 { font-size: 16px; margin-top: 20px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            td, th { border: 1px solid #ddd; padding: 6px 10px; }
            th { background: #f3f4f6; }
            pre { background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; }
            hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
            li { margin: 4px 0; }
          </style>
        </head>
        <body>
          <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;">${generatedReport.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  }
}

// Made with Bob
