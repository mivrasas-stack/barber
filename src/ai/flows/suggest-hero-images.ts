'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting hero images for a barber shop website.
 *
 * The flow takes a text description and style preferences as input and returns a URL to a generated image.
 * - suggestHeroImages - A function that suggests hero images.
 * - SuggestHeroImagesInput - The input type for the suggestHeroImages function.
 * - SuggestHeroImagesOutput - The return type for the suggestHeroImages function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestHeroImagesInputSchema = z.object({
  description: z.string().describe('A description of the desired hero image.'),
  stylePreferences: z.string().describe('Style preferences for the image, such as dark and masculine.'),
});
export type SuggestHeroImagesInput = z.infer<typeof SuggestHeroImagesInputSchema>;

const SuggestHeroImagesOutputSchema = z.object({
  imageUrl: z.string().describe('The URL of the generated hero image.'),
});
export type SuggestHeroImagesOutput = z.infer<typeof SuggestHeroImagesOutputSchema>;

export async function suggestHeroImages(input: SuggestHeroImagesInput): Promise<SuggestHeroImagesOutput> {
  return suggestHeroImagesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestHeroImagesPrompt',
  input: {schema: SuggestHeroImagesInputSchema},
  output: {schema: SuggestHeroImagesOutputSchema},
  prompt: `Generate a hero image for a barber shop website based on the following description and style preferences.

Description: {{{description}}}
Style Preferences: {{{stylePreferences}}}

Ensure the image is suitable for use as a website hero image.
`,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const suggestHeroImagesFlow = ai.defineFlow(
  {
    name: 'suggestHeroImagesFlow',
    inputSchema: SuggestHeroImagesInputSchema,
    outputSchema: SuggestHeroImagesOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: input.description + ' with style preferences: ' + input.stylePreferences,
    });

    if (!media || !media.url) {
      throw new Error('Failed to generate image.');
    }

    return {imageUrl: media.url};
  }
);
