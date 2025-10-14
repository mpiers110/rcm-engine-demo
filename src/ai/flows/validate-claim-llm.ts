'use server';

/**
 * @fileOverview This flow uses an LLM to validate a single claim against a set of adjudication rules.
 *
 * - validateClaimLLM - A function that handles the claim validation process.
 * - ValidateClaimLLMInput - The input type for the validateClaimLLM function.
 * - ValidateClaimLLMOutput - The return type for the validateClaimLLM function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateClaimLLMInputSchema = z.object({
  claimData: z.string().describe('A single claim object in JSON format.'),
  medicalRules: z.string().describe('The medical adjudication rules document.'),
  technicalRules: z.string().describe('The technical adjudication rules document.'),
});
export type ValidateClaimLLMInput = z.infer<typeof ValidateClaimLLMInputSchema>;

const ValidateClaimLLMOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the claim is valid according to the rules.'),
  errors: z
    .array(z.string())
    .describe('A list of validation errors found. Empty if the claim is valid.'),
  errorType: z
    .enum(['No error', 'Medical error', 'Technical error', 'both'])
    .describe('The category of the primary error.'),
});
export type ValidateClaimLLMOutput = z.infer<typeof ValidateClaimLLMOutputSchema>;

const prompt = ai.definePrompt({
  name: 'validateClaimLLMPrompt',
  input: {schema: ValidateClaimLLMInputSchema},
  output: {schema: ValidateClaimLLMOutputSchema},
  prompt: `You are an expert claim adjudicator. Your task is to validate a single insurance claim against a provided set of medical and technical rules.

Carefully review the claim data and both rule documents. Identify all violations.

- If there are no violations, set 'isValid' to true and 'errors' to an empty array.
- If there are violations, set 'isValid' to false and populate the 'errors' array with a concise, one-sentence description for each distinct violation.
- Determine the 'errorType'. If there are both medical and technical errors, use 'both'. Otherwise, use 'Medical error' or 'Technical error' as appropriate.

Claim Data:
\`\`\`json
{{{claimData}}}
\`\`\`

Medical Rules:
---
{{{medicalRules}}}
---

Technical Rules:
---
{{{technicalRules}}}
---
`,
});

export async function validateClaimLLM(
  input: ValidateClaimLLMInput
): Promise<ValidateClaimLLMOutput> {
  const {output} = await prompt(input);
  return output!;
}
