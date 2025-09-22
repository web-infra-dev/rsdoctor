import { setFailed, summary } from '@actions/core';
import { DefaultArtifactClient } from '@actions/artifact';
import path from 'path';
import * as fs from 'fs';
import { GitHubService } from './github';

export async function downloadArtifact(artifactId: number, fileName: string) {
  const artifactClient = new DefaultArtifactClient();

  // Download the artifact
  const downloadResponse = await artifactClient.downloadArtifact(artifactId);

  if (!downloadResponse.downloadPath) {
    throw new Error('Artifact download failed: No download path returned.');
  }

  console.log(
    `Successfully downloaded artifact to: ${downloadResponse.downloadPath}`,
  );

  // Read and log the JSON data from the downloaded artifact
  const downloadedFilePath = path.join(downloadResponse.downloadPath, fileName);
  const fileContent = await fs.promises.readFile(downloadedFilePath, 'utf-8');
  const jsonData = JSON.parse(fileContent);

  console.log('--- Downloaded Artifact JSON Data ---');
  console.log(jsonData);
  console.log('------------------------------------');

  // Ensure jsonData is an array for table generation
  const dataForTable = Array.isArray(jsonData) ? jsonData : [jsonData];

  // Generate and write summary table
  if (dataForTable.length > 0) {
    const headers = Object.keys(dataForTable[0]);
    const headerRow = headers.map((h) => ({ data: h, header: true }));
    const bodyRows = dataForTable.map((row) =>
      headers.map((header) => {
        const cellData = row[header];
        // Stringify objects/arrays for proper display in the table
        if (typeof cellData === 'object' && cellData !== null) {
          return JSON.stringify(cellData);
        }
        return String(cellData ?? '');
      }),
    );

    await summary
      .addHeading('Artifact Content')
      .addTable([headerRow, ...bodyRows])
      .write();
    console.log('Successfully wrote artifact content to job summary.');
  } else {
    console.log('JSON data is empty, skipping table generation.');
  }

  return {
    downloadPath: downloadResponse.downloadPath,
    jsonData: jsonData,
  };
}

export async function downloadArtifactByCommitHash(
  commitHash: string,
  fileName: string,
) {
  const githubService = new GitHubService();

  // Find artifact by commit hash pattern
  const artifact = await githubService.findArtifactByNamePattern(commitHash);

  if (!artifact) {
    throw new Error(`No artifact found for commit hash: ${commitHash}`);
  }

  console.log(`Found artifact: ${artifact.name} (ID: ${artifact.id})`);

  // Download using the artifact ID
  return await downloadArtifact(artifact.id, fileName);
}
