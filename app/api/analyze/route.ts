import { NextRequest, NextResponse } from 'next/server';
import { analyzePromptWithVertex } from '@/lib/vertex-ai';

export const maxDuration = 300;
import { getPromptPackValidationError, validatePromptPack } from '@/lib/prompt-validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const promptPack = body.promptPack;
    const validationError = getPromptPackValidationError(promptPack);

    if (validationError || !validatePromptPack(promptPack)) {
      return NextResponse.json(
        { error: validationError ?? 'Invalid prompt pack' },
        { status: 400 }
      );
    }

    const analysisResult = await analyzePromptWithVertex(promptPack);

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze prompt' },
      { status: 500 }
    );
  }
}

// Made with Bob
