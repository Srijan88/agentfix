import { NextRequest, NextResponse } from 'next/server';
import { researchBestPracticesWithVertex } from '@/lib/vertex-ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const topic = body.topic;
    const context = body.context;

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    // Research best practices using Vertex AI
    const result = await researchBestPracticesWithVertex(topic, context);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in research API:', error);
    return NextResponse.json(
      { error: 'Failed to research topic' },
      { status: 500 }
    );
  }
}

// Made with Bob
