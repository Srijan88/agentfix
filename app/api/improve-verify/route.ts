import { NextRequest, NextResponse } from 'next/server';
import { generateIterativeFixedPromptWithVertex } from '@/lib/vertex-ai';

export const maxDuration = 300;
import { getPromptPackValidationError, validatePromptPack } from '@/lib/prompt-validation';
import { runFixedScenarioRetest } from '@/lib/verification/retest';
import type {
  AnalysisResult,
  AttackResult,
  AttackScenario,
  HealVerifyResult,
  HealingIteration,
  IterativeHealedPromptResult,
  PromptIssue,
  PromptPack,
  VerifiedAttackResult,
} from '@/types';

const MAX_ALLOWED_ITERATIONS = 5;

function getOriginalFailedCount(attackResult: AttackResult) {
  const scenarioFailedCount = attackResult.scenarios.filter((scenario) => !scenario.passed).length;
  return typeof attackResult.summary?.failed === 'number'
    ? attackResult.summary.failed
    : scenarioFailedCount;
}

function calculateReduction(beforeFailed: number, afterFailed: number) {
  if (beforeFailed === 0) return 100;
  return Math.max(0, Math.round(((beforeFailed - afterFailed) / beforeFailed) * 100));
}

function calculateReliabilityFromAttackResult(attackResult: AttackResult) {
  const total = attackResult.scenarios.length || attackResult.summary.totalTests || 0;
  if (total === 0) return 0;
  const passed = attackResult.scenarios.filter((scenario) => scenario.passed).length;
  return Math.round((passed / total) * 100);
}

function scenarioToVerifiedFailure(scenario: AttackScenario): VerifiedAttackResult {
  return {
    id: scenario.id,
    category: scenario.category,
    scenarioName: scenario.scenarioName || `${scenario.category}: ${scenario.id}`,
    simulatedUserInput: scenario.simulatedInput,
    expectedSafeBehavior: scenario.expectedBehavior,
    actualOrLikelyBehavior: scenario.actualOrLikelyBehavior || scenario.likelyBehavior,
    agentResponse: scenario.agentResponse || scenario.likelyBehavior,
    transcript: scenario.transcript || [
      { role: 'user', content: scenario.simulatedInput },
      { role: 'agent', content: scenario.likelyBehavior },
    ],
    passed: false,
    failureReason: scenario.failureReason || 'Original attack mode marked this scenario as failed.',
    severity: scenario.severity,
    confidence: scenario.confidence,
    recommendedDefense: scenario.recommendedDefense,
  };
}

function toHealedPromptPack(result: IterativeHealedPromptResult) {
  return {
    ...result.improvedPromptPack,
    improvements: result.changesMade.map((change) => ({
      section: change.section as keyof PromptPack,
      changes: [change.change],
    })),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const promptPack = body.promptPack;
    const analysisResult: AnalysisResult | null = body.analysisResult ?? null;
    const originalAttackResults: AttackResult | null = body.originalAttackResults ?? null;
    const maxIterations = Number(body.maxIterations);
    const validationError = getPromptPackValidationError(promptPack);

    if (validationError || !validatePromptPack(promptPack)) {
      return NextResponse.json(
        { error: validationError ?? 'Invalid prompt pack' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > MAX_ALLOWED_ITERATIONS) {
      return NextResponse.json(
        { error: 'Max healing iterations must be an integer between 1 and 5.' },
        { status: 400 }
      );
    }

    if (!originalAttackResults?.scenarios?.length) {
      return NextResponse.json(
        { error: 'Re-test failed because no original attack scenarios were found. Run Attack Mode first.' },
        { status: 400 }
      );
    }

    const scenarios = originalAttackResults.scenarios;
    const originalFailedCount = getOriginalFailedCount(originalAttackResults);
    const reliabilityBefore = calculateReliabilityFromAttackResult(originalAttackResults);
    const analysisIssues: PromptIssue[] = analysisResult?.issues ?? [];
    const iterations: HealingIteration[] = [];
    const previousHealingAttempts: IterativeHealedPromptResult[] = [];
    let currentPromptPack: PromptPack = promptPack;
    let failedAttackResults = scenarios
      .filter((scenario) => !scenario.passed)
      .map(scenarioToVerifiedFailure);
    let stoppedReason: HealVerifyResult['stoppedReason'] = 'max_iterations_reached';

    for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
      const healed = await generateIterativeFixedPromptWithVertex({
        originalPromptPack: promptPack,
        currentPromptPack,
        analysisIssues,
        failedAttackResults,
        previousHealingAttempts,
        iteration,
        maxIterations,
      });

      previousHealingAttempts.push(healed);
      currentPromptPack = healed.improvedPromptPack;

      const retest = await runFixedScenarioRetest({
        promptPack: currentPromptPack,
        scenarios,
      });
      const vulnerabilityReduction = calculateReduction(originalFailedCount, retest.failedCount);

      iterations.push({
        iteration,
        promptPack: currentPromptPack,
        attackResults: retest.results,
        failedCount: retest.failedCount,
        passedCount: retest.passedCount,
        reliabilityScore: retest.reliabilityScore,
        vulnerabilityReduction,
        changesMade: healed.changesMade,
        summary: `Iteration ${iteration}: ${retest.passedCount}/${retest.results.length} attacks passed, ${retest.failedCount} still failed.`,
      });

      failedAttackResults = retest.results.filter((result) => !result.passed);

      if (retest.failedCount === 0) {
        stoppedReason = 'all_attacks_passed';
        break;
      }
    }

    const lastIteration = iterations.at(-1);
    const finalFailedCount = lastIteration?.failedCount ?? originalFailedCount;
    const reliabilityAfter = lastIteration?.reliabilityScore ?? reliabilityBefore;
    const vulnerabilityReduction = calculateReduction(originalFailedCount, finalFailedCount);

    const result: HealVerifyResult & { healedPromptPack: ReturnType<typeof toHealedPromptPack> } = {
      finalPromptPack: currentPromptPack,
      healedPromptPack: toHealedPromptPack(previousHealingAttempts.at(-1) ?? {
        improvedPromptPack: currentPromptPack,
        changesMade: [],
        expectedImprovements: [],
        remainingRisks: [],
      }),
      iterations,
      originalFailedCount,
      finalFailedCount,
      vulnerabilityReduction,
      reliabilityBefore,
      reliabilityAfter,
      stoppedReason,
      success: stoppedReason === 'all_attacks_passed',
      remainingFailures: lastIteration?.attackResults.filter((resultItem) => !resultItem.passed) ?? [],
    };

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Healing verification failed.';
    return NextResponse.json(
      {
        error: message,
        stoppedReason: 'error',
        success: false,
      },
      { status: 500 }
    );
  }
}

