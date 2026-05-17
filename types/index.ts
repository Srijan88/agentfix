// Core type definitions for AgentFix Playground

export type Severity = 'none' | 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type IssueCategory = 
  | 'maintainability'
  | 'security'
  | 'performance'
  | 'functionality'
  | 'style';

export type IssueType =
  | 'naming-intent-review'
  | 'comment-quality-analysis'
  | 'magic-numbers-strings'
  | 'single-responsibility-violation'
  | 'modularity-function-length'
  | 'function-length'
  | 'style-consistency-check'
  | 'style-guide-enforcement'
  | 'dry-principle-violation'
  | 'log-level-usage-review'
  | 'company-standards-violation'
  | 'sensitive-data-logging'
  | 'input-sanitization-review'
  | 'gitignore-file-recommendations'
  | 'secure-dependency-check'
  | 'suggest-security-fixes'
  | 'inefficient-algorithm'
  | 'memory-leak'
  | 'resource-leak'
  | 'unnecessary-computation'
  | 'blocking-operation'
  | 'edge-case-handling'
  | 'error-handling-review'
  | 'issue-alignment-scoring'
  | 'race-condition-warning'
  | 'global-state-warning'
  | 'backward-compatibility-warnings'
  | 'inconsistent-formatting'
  | 'missing-documentation'
  | 'unclear-comments'
  | 'naming-convention'
  | 'prompt-injection-risk'
  | 'instruction-override-risk'
  | 'hallucination-prone'
  | 'conflicting-instructions'
  | 'vague-tool-rules'
  | 'missing-escalation'
  | 'missing-confirmation'
  | 'weak-guardrails'
  | 'unclear-role'
  | 'missing-fallback'
  | 'weak-refusal'
  | 'unsafe-assumptions'
  | 'over-permissive-tools'
  | 'lack-of-boundaries';

export interface PromptPack {
  systemPrompt: string;
  developerPrompt: string;
  toolUseInstructions: string;
  fallbackBehavior: string;
  escalationRules: string;
  confirmationRules: string;
  refusalRedirectRules: string;
  agentBoundaries: string;
}

export interface PromptIssue {
  id: string;
  title: string;
  category: IssueCategory;
  type: IssueType;
  severity: Severity;
  confidence: number; // 0-100
  affectedSection: keyof PromptPack;
  explanation: string;
  recommendedFix: string;
  lineNumber?: number;
}

export type AttackCategory =
  | 'prompt-injection'
  | 'jailbreak'
  | 'social-engineering'
  | 'data-leakage'
  | 'tool-misuse'
  | 'missing-confirmation'
  | 'unsupported-request'
  | 'intent-change'
  | 'confused-user'
  | 'angry-user'
  | 'ambiguous-request'
  | 'repeated-pressure'
  | 'hallucination-risk'
  | 'escalation-failure'
  | 'fallback-loop'
  | 'policy-violation'
  | 'instruction-leakage'
  | 'unsafe-execution'
  | 'over-sharing'
  | 'recovery-failure';

export interface AttackScenario {
  id: string;
  category: AttackCategory;
  simulatedInput: string;       // final / only attack turn (used for display)
  turns?: string[];             // multi-turn: array of user messages leading to the attack
  expectedBehavior: string;
  likelyBehavior: string;
  passed: boolean;
  failureReason?: string;
  severity: Severity;
  confidence: number; // 0-100
  recommendedDefense: string;
  scenarioName?: string;
  actualOrLikelyBehavior?: string;
  agentResponse?: string;
  transcript?: TranscriptEntry[];
}

export interface ReliabilityScore {
  overall: number; // 0-100
  categories: {
    roleClarity: number;
    instructionClarity: number;
    fallbackHandling: number;
    toolUseSafety: number;
    confirmationBehavior: number;
    escalationBehavior: number;
    promptInjectionResistance: number;
    conversationRecovery: number;
    unsupportedRequestHandling: number;
    hallucinationResistance: number;
    scopeControl: number;
    refusalRedirectQuality: number;
    sensitiveDataProtection: number;
  };
}

export interface AnalysisResult {
  issues: PromptIssue[];
  reliabilityScore: ReliabilityScore;
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    informationalCount: number;
  };
}

export interface AttackResult {
  scenarios: AttackScenario[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    criticalFailures: number;
    highFailures: number;
  };
}

export interface TranscriptEntry {
  role: 'user' | 'agent' | 'system';
  content: string;
}

export interface LiveAgentTestResult {
  scenarioName: string;
  simulatedUserInput: string;
  agentResponse: string;
  transcript: TranscriptEntry[];
  rawProvider?: unknown;
}

export interface VerifiedAttackResult {
  id: string;
  category: AttackCategory;
  scenarioName: string;
  simulatedUserInput: string;
  expectedSafeBehavior: string;
  actualOrLikelyBehavior: string;
  agentResponse: string;
  transcript: TranscriptEntry[];
  passed: boolean;
  failureReason: string;
  severity: Severity;
  confidence: number;
  recommendedDefense: string;
}

export interface FixedScenarioRetestResult {
  results: VerifiedAttackResult[];
  failedCount: number;
  passedCount: number;
  reliabilityScore: number;
}

export interface ChangeMade {
  section: keyof PromptPack | string;
  change: string;
  reason: string;
  relatedFailedAttack?: string;
}

export interface IterativeHealedPromptResult {
  improvedPromptPack: PromptPack;
  changesMade: ChangeMade[];
  expectedImprovements: string[];
  remainingRisks: string[];
}

export interface HealingIteration {
  iteration: number;
  promptPack: PromptPack;
  attackResults: VerifiedAttackResult[];
  failedCount: number;
  passedCount: number;
  reliabilityScore: number;
  vulnerabilityReduction: number;
  changesMade: ChangeMade[];
  summary?: string;
}

export interface HealVerifyResult {
  finalPromptPack: PromptPack;
  iterations: HealingIteration[];
  originalFailedCount: number;
  finalFailedCount: number;
  vulnerabilityReduction: number;
  reliabilityBefore: number;
  reliabilityAfter: number;
  stoppedReason: 'all_attacks_passed' | 'max_iterations_reached' | 'error';
  success: boolean;
  remainingFailures: VerifiedAttackResult[];
}

export interface HealedPromptPack extends PromptPack {
  improvements: {
    section: keyof PromptPack;
    changes: string[];
  }[];
}

export interface ComparisonResult {
  before: PromptPack;
  after: HealedPromptPack;
  reliabilityImprovement: {
    before: ReliabilityScore;
    after: ReliabilityScore;
    percentageIncrease: number;
  };
  vulnerabilityReduction: number; // percentage
  fixedIssues: PromptIssue[];
  remainingRisks: PromptIssue[];
}

export interface DeveloperReport {
  projectName: string;
  timestamp: string;
  originalPromptSummary: string;
  issuesFound: PromptIssue[];
  attackScenariosTested: AttackScenario[];
  failedScenarios: AttackScenario[];
  recommendedFixes: string[];
  improvedPromptPack: HealedPromptPack;
  beforeAfterComparison: string;
  reliabilityScores: {
    before: number;
    after: number;
  };
  vulnerabilityReduction: number;
  remainingRisks: PromptIssue[];
  nextRecommendations: string[];
  runtimeLLM: string;
  ibmBobUsage: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ResearchQuery {
  topic: string;
  context?: string;
}

export interface ResearchResult {
  summary: string;
  recommendedSteps: string[];
  implementationGuidance: string;
  suggestedPromptWording: string[];
  warnings: string[];
}

// Observability types for Vertex AI call monitoring
export interface VertexAICallLog {
  id: string;
  timestamp: string;
  operation: 'analyze' | 'attack' | 'heal' | 'ask' | 'research' | 'report' | 'retest' | 'heal-verify';
  status: 'pending' | 'success' | 'error';
  model: string;
  prompt: string;
  promptTokens?: number;
  response?: string;
  responseTokens?: number;
  durationMs?: number;
  error?: string;
  metadata?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

export interface ObservabilityState {
  enabled: boolean;
  calls: VertexAICallLog[];
  totalCalls: number;
  totalDurationMs: number;
  successCount: number;
  errorCount: number;
}

// Made with Bob
