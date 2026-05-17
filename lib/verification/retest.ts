import type {
  AttackScenario,
  FixedScenarioRetestResult,
  PromptPack,
  VerifiedAttackResult,
} from '@/types';
import { evaluateLiveAgentResponseWithVertex } from '@/lib/vertex-ai';
import { runVertexTextAgentTest } from '@/lib/vertex/textAgentRunner';

// Cap scenarios and run in parallel batches to avoid 15-min sequential waits.
const MAX_RETEST_SCENARIOS = 10;
const CONCURRENCY = 3; // 3 scenarios in parallel at a time

function severityRank(severity: VerifiedAttackResult['severity']) {
  const ranks: Record<VerifiedAttackResult['severity'], number> = {
    none: 0, informational: 1, low: 2, medium: 3, high: 4, critical: 5,
  };
  return ranks[severity] ?? 0;
}

function normalizeScenarioResult(
  scenario: AttackScenario,
  textResponse: Awaited<ReturnType<typeof runVertexTextAgentTest>>,
  evaluation: Awaited<ReturnType<typeof evaluateLiveAgentResponseWithVertex>>
): VerifiedAttackResult {
  return {
    id: scenario.id,
    category: scenario.category,
    scenarioName: scenario.scenarioName || `${scenario.category}: ${scenario.id}`,
    simulatedUserInput: scenario.simulatedInput,
    expectedSafeBehavior: scenario.expectedBehavior,
    actualOrLikelyBehavior: evaluation.actualOrLikelyBehavior || textResponse.agentResponse,
    agentResponse: textResponse.agentResponse,
    transcript: textResponse.transcript,
    passed: Boolean(evaluation.passed),
    failureReason: evaluation.passed ? '' : evaluation.failureReason || 'The observed response did not satisfy the expected safe behavior.',
    severity: evaluation.passed ? 'none' : evaluation.severity || scenario.severity,
    confidence: Math.max(0, Math.min(100, Number(evaluation.confidence) || scenario.confidence || 0)),
    recommendedDefense: evaluation.recommendedDefense || scenario.recommendedDefense,
  };
}

function sortFailuresFirst(results: VerifiedAttackResult[]) {
  return [...results].sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? 1 : -1;
    return severityRank(b.severity) - severityRank(a.severity);
  });
}

// Run one scenario: agent response + evaluation, return a normalised result.
// On any failure, returns a synthetic failed result so the batch continues.
async function runOneScenario(
  scenario: AttackScenario,
  promptPack: PromptPack
): Promise<VerifiedAttackResult> {
  try {
    const textResponse = await runVertexTextAgentTest({ promptPack, scenario });
    const evaluation = await evaluateLiveAgentResponseWithVertex({
      scenario,
      promptPack,
      agentResponse: textResponse.agentResponse,
      transcript: textResponse.transcript,
    });
    return normalizeScenarioResult(scenario, textResponse, evaluation);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Scenario evaluation failed.';
    console.error(JSON.stringify({ source: 'agentfix.retest', event: 'scenario-error', scenarioId: scenario.id, error: msg }));
    // Return a synthetic failed result so the overall retest can still complete
    return {
      id: scenario.id,
      category: scenario.category,
      scenarioName: scenario.scenarioName || `${scenario.category}: ${scenario.id}`,
      simulatedUserInput: scenario.simulatedInput,
      expectedSafeBehavior: scenario.expectedBehavior,
      actualOrLikelyBehavior: 'Evaluation failed — Vertex AI did not respond.',
      agentResponse: 'Evaluation error.',
      transcript: [{ role: 'user', content: scenario.simulatedInput }, { role: 'agent', content: 'Evaluation error.' }],
      passed: false,
      failureReason: `Vertex AI evaluation error: ${msg}`,
      severity: scenario.severity,
      confidence: scenario.confidence || 0,
      recommendedDefense: scenario.recommendedDefense,
    };
  }
}

// Run items in parallel with a concurrency cap.
async function runConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

export async function runFixedScenarioRetest({
  promptPack,
  scenarios,
}: {
  promptPack: PromptPack;
  scenarios: AttackScenario[];
}): Promise<FixedScenarioRetestResult> {
  if (!scenarios.length) {
    throw new Error('Re-test failed because no original attack scenarios were found. Run Attack Mode first.');
  }

  // Prioritise failed / high-severity scenarios, then cap
  const sorted = [...scenarios].sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? 1 : -1;
    return severityRank(b.severity as VerifiedAttackResult['severity']) - severityRank(a.severity as VerifiedAttackResult['severity']);
  });
  const scenariosToRun = sorted.slice(0, MAX_RETEST_SCENARIOS);

  console.log(JSON.stringify({
    source: 'agentfix.retest',
    event: 'start',
    total: scenariosToRun.length,
    concurrency: CONCURRENCY,
  }));

  const results = await runConcurrent(
    scenariosToRun,
    (scenario) => runOneScenario(scenario, promptPack),
    CONCURRENCY
  );

  const failedCount = results.filter((r) => !r.passed).length;
  const passedCount = results.length - failedCount;
  const reliabilityScore = results.length > 0
    ? Math.round((passedCount / results.length) * 100)
    : 0;

  console.log(JSON.stringify({
    source: 'agentfix.retest',
    event: 'complete',
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    reliabilityScore,
  }));

  return {
    results: sortFailuresFirst(results),
    failedCount,
    passedCount,
    reliabilityScore,
  };
}
