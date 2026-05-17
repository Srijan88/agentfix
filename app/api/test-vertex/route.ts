import { NextRequest, NextResponse } from 'next/server';
import { callVertexAI, VERTEX_MODEL } from '@/lib/vertex-ai';

export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: false,
        error: 'Vertex test route is disabled in production.',
      }, { status: 404 });
    }

    const testSecret = process.env.VERTEX_TEST_SECRET;
    const providedSecret = request.headers.get('x-agentfix-admin-secret');

    if (testSecret && providedSecret !== testSecret) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized.',
      }, { status: 401 });
    }

    const response = await callVertexAI('Return only valid JSON: {"message":"Hello from Vertex AI"}');

    return NextResponse.json({
      success: true,
      response,
      model: VERTEX_MODEL,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      success: false,
      error: message,
      model: VERTEX_MODEL,
    }, { status: 500 });
  }
}
