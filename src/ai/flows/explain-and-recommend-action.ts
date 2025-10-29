'use server';

/**
 * @fileOverview This flow uses an LLM to generate a clear explanation of the error based on the extracted adjudication rules
 * and a targeted recommendation for corrective action.
 *
 * - explainAndRecommendAction - A function that handles the error explanation and recommendation generation process.
 * - ExplainAndRecommendActionInput - The input type for the explainAndRecommendAction function.
 * - ExplainAndRecommendActionOutput - The return type for the explainAndRecommendAction function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainAndRecommendActionInputSchema = z.object({
  claimData: z.array(z.object({
    status: z.string(),
    encounterType: z.string(),
    serviceDate: z.string(),
    diagnosisCodes: z.array(z.string()).nullable().default([]),
    approvalNumber: z.string(),
        serviceCode: z.string(),
        paidAmount: z.number(),
        validationResult: z.object({
          isValid: z.boolean(),
          errors: z.array(z.string()),
        }).optional(),
        facilityId: z.string(),
         claimNumber: z.string(),
         errors: z.array(z.object({
  type: z.string(),
          category: z.string(),
          message: z.string(),
          action: z.string()
         })),
  errorType: z.string().describe('The type of error encountered.'),

  })).describe('The claim data.'),
  adjudicationRules: z
    .string()
    .describe('The extracted adjudication rules in JSON format.'),
});
export type ExplainAndRecommendActionInput = z.infer<
  typeof ExplainAndRecommendActionInputSchema
>;

const ExplainAndRecommendActionOutputSchema = z.object({
  errorExplanation: z.string().describe('A clear explanation of the error.'),
  recommendedAction: z
    .string()
    .describe('A targeted recommendation for corrective action.'),
});
export type ExplainAndRecommendActionOutput = z.infer<
  typeof ExplainAndRecommendActionOutputSchema
>;

const prompt = ai.definePrompt({
  name: 'explainAndRecommendActionPrompt',
  input: {schema: ExplainAndRecommendActionInputSchema},
  output: {schema: ExplainAndRecommendActionOutputSchema},
  prompt: `You are an expert claim adjudicator. Given the following claim data, error type, and adjudication rules, generate a clear explanation of the error and a targeted recommendation for corrective action.\n\nClaim Data: {{{claimData}}}\nError Type: {{{errorType}}}\nAdjudication Rules: {{{adjudicationRules}}}\n\nExplanation:\nRecommended Action:`,
});

const explainAndRecommendActionFlow = ai.defineFlow(
  {
    name: 'explainAndRecommendActionFlow',
    inputSchema: ExplainAndRecommendActionInputSchema,
    outputSchema: ExplainAndRecommendActionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function explainAndRecommendAction(
  input: ExplainAndRecommendActionInput
): Promise<ExplainAndRecommendActionOutput> {
  return explainAndRecommendActionFlow(input);
}
