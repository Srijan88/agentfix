import { NextRequest, NextResponse } from 'next/server';
import { generateFixedPromptWithVertex } from '@/lib/vertex-ai';

export const maxDuration = 300;
import { getPromptPackValidationError, validatePromptPack } from '@/lib/prompt-validation';
import type { AttackScenario, PromptIssue } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const promptPack = body.promptPack;
    const issues: PromptIssue[] = Array.isArray(body.issues) ? body.issues : [];
    const attackResults: AttackScenario[] = Array.isArray(body.attackResults) ? body.attackResults : [];
    const validationError = getPromptPackValidationError(promptPack);

    if (validationError || !validatePromptPack(promptPack)) {
      return NextResponse.json(
        { error: validationError ?? 'Invalid prompt pack' },
        { status: 400 }
      );
    }

    const healedPrompt = await generateFixedPromptWithVertex(
      promptPack,
      issues,
      attackResults
    );

    return NextResponse.json(healedPrompt);
  } catch (error) {
    console.error('Error in heal API:', error);
    return NextResponse.json(
      { error: 'Failed to generate improved prompt' },
      { status: 500 }
    );
  }
}

// Made with Bob
