import z from 'zod';

const SizeSchema = z.object({
  sourceSize: z.number(),
  transformedSize: z.number(),
  parsedSize: z.number(),
});

const PackageSchema = z.object({
  id: z.number(),
  name: z.string(),
  version: z.string(),
  size: SizeSchema,
});

const PackageListSchema = z.array(PackageSchema);

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
