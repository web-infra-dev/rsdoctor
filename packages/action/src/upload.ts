import { setFailed, summary } from '@actions/core';
import { DefaultArtifactClient } from '@actions/artifact';
import path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export async function uploadArtifact(commitHash?: string, filePath?: string) {
  const artifactClient = new DefaultArtifactClient();

  const hash =
    commitHash ||
    execSync('git rev-parse --short=10 HEAD', { encoding: 'utf8' }).trim();

  const targetFilePath =
    filePath || path.join(process.cwd(), 'artifacts', '1.json');
  const fileName = path.basename(targetFilePath);

  const relativePath = path.relative(process.cwd(), targetFilePath);
  const pathParts = relativePath.split(path.sep);
  const fileNameWithoutExt = path.parse(fileName).name;
  const fileExt = path.parse(fileName).ext;

  const artifactName = `${pathParts.join('-')}-${fileNameWithoutExt}-${hash}${fileExt}`;

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
