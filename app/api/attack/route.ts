import { NextRequest, NextResponse } from 'next/server';
import { runAttackEvaluationWithVertex, SimulationProfileKey } from '@/lib/vertex-ai';

export const maxDuration = 300;
import { getPromptPackValidationError, validatePromptPack } from '@/lib/prompt-validation';
import type { AttackScenario } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const promptPack = body.promptPack;
    const scenarios: AttackScenario[] = Array.isArray(body.scenarios) ? body.scenarios : [];
    const selectedProfiles: SimulationProfileKey[] = Array.isArray(body.selectedProfiles)
      ? body.selectedProfiles
      : ['context-identity', 'system-boundaries', 'tool-exploitation'];
    const totalAttacksRequested: number = typeof body.totalAttacksRequested === 'number'
      ? body.totalAttacksRequested
      : 14;
    const liveProbe: boolean = body.liveProbe === true;
    const attackTurns: number = typeof body.attackTurns === 'number'
      ? Math.max(1, Math.min(3, body.attackTurns))
      : 1;

    const validationError = getPromptPackValidationError(promptPack);
    if (validationError || !validatePromptPack(promptPack)) {
      return NextResponse.json(
        { error: validationError ?? 'Invalid prompt pack' },
        { status: 400 }
      );
    }

    const attackResult = await runAttackEvaluationWithVertex(
      promptPack,
      scenarios,
      selectedProfiles,
      totalAttacksRequested,
      liveProbe,
      attackTurns
    );

    return NextResponse.json(attackResult);
  } catch (error) {
    console.error('Error in attack API:', error);
    return NextResponse.json(
      { error: 'Failed to run attack evaluation' },
      { status: 500 }
    );
  }
}

// Made with Bob
