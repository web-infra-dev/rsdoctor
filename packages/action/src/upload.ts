import { DefaultArtifactClient } from '@actions/artifact';
import path from 'path';
import { execSync } from 'child_process';

export async function uploadArtifact(commitHash?: string, filePath?: string) {
  const artifactClient = new DefaultArtifactClient();

  // Get commit hash (use provided or get current)
  const hash =
    commitHash ||
    execSync('git rev-parse --short=10 HEAD', { encoding: 'utf8' }).trim();

  // Use provided file path or default
  const targetFilePath =
    filePath || path.join(process.cwd(), 'artifacts', '1.json');
  const fileName = path.basename(targetFilePath);

  // Get relative path from project root
  const relativePath = path.relative(process.cwd(), targetFilePath);
  const pathParts = relativePath.split(path.sep);
  const fileNameWithoutExt = path.parse(fileName).name;
  const fileExt = path.parse(fileName).ext;

  // Create artifact name with format: path-filename-commithash
  const artifactName = `${pathParts.join('-')}-${fileNameWithoutExt}-${hash}${fileExt}`;

  // Upload the artifact
  const uploadResponse = await artifactClient.uploadArtifact(
    artifactName,
    [targetFilePath],
    path.dirname(targetFilePath),
    {
      retentionDays: 90,
    },
  );

  if (!uploadResponse.id) {
    throw new Error('Artifact upload failed: No ID returned.');
  }

  console.log(`Successfully uploaded artifact with ID: ${uploadResponse.id}`);

  return uploadResponse;
}
