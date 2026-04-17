import z from 'zod';

export const assetsAnalysisOutputSchema = z.object({
  optimizedList: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      sourceSize: z.number(),
    }),
  ),
  analysis: z.array(
    z.object({
      id: z.number(),
      result: z.string(),
    }),
  ),
});

export const chunkSplittingOutputSchema = z.object({
  name: z.string(),
  cacheGroups: z.array(
    z.object({
      test: z.string(),
      name: z.string(),
    }),
  ),
});
