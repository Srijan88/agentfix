import { NextRequest } from 'next/server';
import type { VertexAICallLog } from '@/types';

// In-memory store for observability logs (in production, use Redis or similar)
const observabilityLogs: VertexAICallLog[] = [];
let clients: Set<ReadableStreamDefaultController> = new Set();

export const dynamic = 'force-dynamic';

// GET endpoint for SSE stream
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      
      // Send initial logs
      const message = `data: ${JSON.stringify({ type: 'init', logs: observabilityLogs })}\n\n`;
      controller.enqueue(new TextEncoder().encode(message));
      
      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clients.delete(controller);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// POST endpoint to add new log
export async function POST(request: NextRequest) {
  try {
    const log = await request.json() as VertexAICallLog;
    
    // Add timestamp if not present
    if (!log.timestamp) {
      log.timestamp = new Date().toISOString();
    }
    
    // Store log
    observabilityLogs.push(log);
    
    // Keep only last 100 logs
    if (observabilityLogs.length > 100) {
      observabilityLogs.shift();
    }
    
    // Broadcast to all connected clients
    const message = `data: ${JSON.stringify({ type: 'log', log })}\n\n`;
    const encoded = new TextEncoder().encode(message);
    
    clients.forEach((controller) => {
      try {
        controller.enqueue(encoded);
      } catch (err) {
        // Client disconnected, remove it
        clients.delete(controller);
      }
    });
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error adding observability log:', error);
    return Response.json({ success: false, error: 'Failed to add log' }, { status: 500 });
  }
}

// DELETE endpoint to clear logs
export async function DELETE() {
  observabilityLogs.length = 0;
  
  // Broadcast clear event
  const message = `data: ${JSON.stringify({ type: 'clear' })}\n\n`;
  const encoded = new TextEncoder().encode(message);
  
  clients.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch (err) {
      clients.delete(controller);
    }
  });
  
  return Response.json({ success: true });
}

// Made with Bob