'use server';

/**
 * @fileOverview Generates a blog post outline from a title.
 *
 * - generateBlogOutline - A function that generates a blog post outline.
 * - GenerateBlogOutlineInput - The input type for the generateBlogOutline function.
 * - GenerateBlogOutlineOutput - The return type for the generateBlogOutline function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBlogOutlineInputSchema = z.object({
  title: z.string().describe('The title of the blog post.'),
});
export type GenerateBlogOutlineInput = z.infer<typeof GenerateBlogOutlineInputSchema>;

const GenerateBlogOutlineOutputSchema = z.object({
  outline: z.string().describe('The outline of the blog post.'),
});
export type GenerateBlogOutlineOutput = z.infer<typeof GenerateBlogOutlineOutputSchema>;

export async function generateBlogOutline(input: GenerateBlogOutlineInput): Promise<GenerateBlogOutlineOutput> {
  return generateBlogOutlineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBlogOutlinePrompt',
  input: {schema: GenerateBlogOutlineInputSchema},
  output: {schema: GenerateBlogOutlineOutputSchema},
  prompt: `You are an expert blog post outline generator.

  Given the title of a blog post, generate an outline for the blog post.

  Title: {{{title}}}
  `,
});

const generateBlogOutlineFlow = ai.defineFlow(
  {
    name: 'generateBlogOutlineFlow',
    inputSchema: GenerateBlogOutlineInputSchema,
    outputSchema: GenerateBlogOutlineOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
