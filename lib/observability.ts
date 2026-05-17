// Observability utilities for tracking Vertex AI calls
import type { VertexAICallLog } from '@/types';

let observabilityEnabled = false;

export function setObservabilityEnabled(enabled: boolean) {
  observabilityEnabled = enabled;
}

export function isObservabilityEnabled(): boolean {
  return observabilityEnabled;
}

export async function logVertexAICall(log: Omit<VertexAICallLog, 'id' | 'timestamp'>): Promise<void> {
  if (!observabilityEnabled) return;
  
  const fullLog: VertexAICallLog = {
    ...log,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  
  try {
    // Send to observability API endpoint
    await fetch('/api/observability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullLog),
    });
  } catch (error) {
    console.error('Failed to log Vertex AI call:', error);
  }
}

export function createVertexAILogger(operation: VertexAICallLog['operation']) {
  return {
    start: (prompt: string, model: string, metadata?: VertexAICallLog['metadata']) => {
      const startTime = Date.now();
      const logId = `${startTime}-${Math.random().toString(36).substr(2, 9)}`;
      
      logVertexAICall({
        operation,
        status: 'pending',
        model,
        prompt,
        metadata,
      });
      
      return {
        success: (response: string, responseTokens?: number) => {
          const durationMs = Date.now() - startTime;
          logVertexAICall({
            operation,
            status: 'success',
            model,
            prompt,
            response,
            responseTokens,
            durationMs,
            metadata,
          });
        },
        error: (error: string) => {
          const durationMs = Date.now() - startTime;
          logVertexAICall({
            operation,
            status: 'error',
            model,
            prompt,
            error,
            durationMs,
            metadata,
          });
        },
      };
    },
  };
}

// Made with Bob