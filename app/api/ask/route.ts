import { NextRequest, NextResponse } from 'next/server';
import { answerPromptQuestionWithVertex } from '@/lib/vertex-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = body.question;
    const context = body.context || {};

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    // Answer question using Vertex AI
    const answer = await answerPromptQuestionWithVertex(question, context);

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('Error in ask API:', error);
    return NextResponse.json(
      { error: 'Failed to answer question' },
      { status: 500 }
    );
  }
}

// Made with Bob
