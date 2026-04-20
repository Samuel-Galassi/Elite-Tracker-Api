import type { z } from 'zod';

// Acesse o tipo através do namespace z
type ZodIssue = z.core.$ZodIssue;

export function buildValidationErrorMessage(issues: ZodIssue[]): string[] {
  const errors = issues.map(
    (item) => `${item.path.join('.')}: ${item.message}`,
  );

  return errors;
}
