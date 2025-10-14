'use server';
/**
 * @fileOverview Summarizes adjudication rules extracted from uploaded documents using an LLM.
 *
 * - summarizeAdjudicationRules - A function that summarizes adjudication rules.
 * - SummarizeAdjudicationRulesInput - The input type for the summarizeAdjudicationRules function.
 * - SummarizeAdjudicationRulesOutput - The return type for the summarizeAdjudicationRules function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeAdjudicationRulesInputSchema = z.object({
  medicalRules: z
    .string()
    .describe('The medical adjudication rules extracted from uploaded documents.'),
  technicalRules: z
    .string()
    .describe('The technical adjudication rules extracted from uploaded documents.'),
});
export type SummarizeAdjudicationRulesInput = z.infer<
  typeof SummarizeAdjudicationRulesInputSchema
>;

const SummarizeAdjudicationRulesOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the medical and technical adjudication rules.'),
});
export type SummarizeAdjudicationRulesOutput = z.infer<
  typeof SummarizeAdjudicationRulesOutputSchema
>;

export async function summarizeAdjudicationRules(
  input: SummarizeAdjudicationRulesInput
): Promise<SummarizeAdjudicationRulesOutput> {
  return summarizeAdjudicationRulesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeAdjudicationRulesPrompt',
  input: {schema: SummarizeAdjudicationRulesInputSchema},
  output: {schema: SummarizeAdjudicationRulesOutputSchema},
  prompt: `You are an expert in summarizing complex documents. Please provide a concise summary of the following adjudication rules, including both medical and technical rules.\n\nMedical Rules: {{{medicalRules}}}\n\nTechnical Rules: {{{technicalRules}}}\n\nSummary: `,
});

const summarizeAdjudicationRulesFlow = ai.defineFlow(
  {
    name: 'summarizeAdjudicationRulesFlow',
    inputSchema: SummarizeAdjudicationRulesInputSchema,
    outputSchema: SummarizeAdjudicationRulesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
