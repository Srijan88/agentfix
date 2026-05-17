import { NextRequest, NextResponse } from 'next/server';
import { generateReportWithVertex } from '@/lib/vertex-ai';
import type { DeveloperReport } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const reportData: Partial<DeveloperReport> = body.reportData;

    if (!reportData) {
      return NextResponse.json(
        { error: 'Report data is required' },
        { status: 400 }
      );
    }

    // Generate report using Vertex AI
    const report = await generateReportWithVertex(reportData);

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error in report API:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// Made with Bob
