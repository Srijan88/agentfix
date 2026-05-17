import type { PromptPack } from '@/types';

export const promptPackFields: (keyof PromptPack)[] = [
  'systemPrompt',
  'developerPrompt',
  'toolUseInstructions',
  'fallbackBehavior',
  'escalationRules',
  'confirmationRules',
  'refusalRedirectRules',
  'agentBoundaries',
];

export function validatePromptPack(value: unknown): value is PromptPack {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybePromptPack = value as Record<keyof PromptPack, unknown>;
  return promptPackFields.every((field) => typeof maybePromptPack[field] === 'string');
}

export function getPromptPackValidationError(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return 'Prompt pack is required';
  }

  const maybePromptPack = value as Record<keyof PromptPack, unknown>;
  const invalidField = promptPackFields.find((field) => typeof maybePromptPack[field] !== 'string');

  return invalidField ? `Missing or invalid field: ${invalidField}` : null;
}
