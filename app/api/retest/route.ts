import { NextRequest, NextResponse } from 'next/server';
import { getPromptPackValidationError, validatePromptPack } from '@/lib/prompt-validation';

export const maxDuration = 300;
import { runFixedScenarioRetest } from '@/lib/verification/retest';
import type { AttackScenario } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const promptPack = body.promptPack;
    const scenarios: AttackScenario[] = Array.isArray(body.scenarios) ? body.scenarios : [];
    const validationError = getPromptPackValidationError(promptPack);

    if (validationError || !validatePromptPack(promptPack)) {
      return NextResponse.json(
        { error: validationError ?? 'Invalid prompt pack' },
        { status: 400 }
      );
    }

    if (!scenarios.length) {
      return NextResponse.json(
        { error: 'Re-test failed because no original attack scenarios were found. Run Attack Mode first.' },
        { status: 400 }
      );
    }

    const result = await runFixedScenarioRetest({ promptPack, scenarios });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Re-test failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

