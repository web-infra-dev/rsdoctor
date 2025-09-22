import { setFailed, getInput } from '@actions/core';
import { uploadArtifact } from './upload';
import { downloadArtifactByCommitHash } from './download';
import { GitHubService } from './github';
import {
  loadSizeData,
  generateSizeReport,
  getDemoBaselineData,
} from './report';
import path from 'path';

function isMergeEvent(): boolean {
  const { context } = require('@actions/github');
  return (
    context.eventName === 'push' &&
    context.payload.ref ===
      `refs/heads/${context.payload.repository.default_branch}`
  );
}

function isPullRequestEvent(): boolean {
  const { context } = require('@actions/github');
  return context.eventName === 'pull_request';
}

(async () => {
  try {
    const githubService = new GitHubService();

    const filePath = getInput('file_path');
    if (!filePath) {
      throw new Error('file_path is required');
    }
    const fullPath = path.resolve(process.cwd(), filePath);
    console.log(`Full path: ${fullPath}`);

    const fileName = path.basename(filePath);
    const relativePath = path.relative(process.cwd(), fullPath);
    const pathParts = relativePath.split(path.sep);
    const fileNameWithoutExt = path.parse(fileName).name;
    const fileExt = path.parse(fileName).ext;

    // Get current commit hash
    const currentCommitHash = githubService.getCurrentCommitHash();
    console.log(`Current commit hash: ${currentCommitHash}`);

    // Create artifact name pattern
    const artifactNamePattern = `${pathParts.join('-')}-${fileNameWithoutExt}-`;
    console.log(`Artifact name pattern: ${artifactNamePattern}`);

    if (isMergeEvent()) {
      console.log(
        '🔄 Detected merge event - uploading current branch artifact only',
      );

      const uploadResponse = await uploadArtifact(currentCommitHash, fullPath);

      if (typeof uploadResponse.id !== 'number') {
        throw new Error('Artifact upload failed: No artifact ID returned.');
      }

      console.log(
        `✅ Successfully uploaded artifact with ID: ${uploadResponse.id}`,
      );

      // Generate simple report for uploaded data
      const currentSizeData = loadSizeData(fullPath);
      if (currentSizeData) {
        await generateSizeReport(currentSizeData);
      }
    } else if (isPullRequestEvent()) {
      console.log(
        '📥 Detected pull request event - downloading target branch artifact if exists',
      );

      // Load current size data
      const currentSizeData = loadSizeData(fullPath);
      if (!currentSizeData) {
        throw new Error(`Failed to load current size data from: ${fullPath}`);
      }

      let baselineSizeData: any = null;

      try {
        // Get target branch latest commit hash
        const targetCommitHash =
          await githubService.getTargetBranchLatestCommit();
        console.log(`Target branch commit hash: ${targetCommitHash}`);

        const targetArtifactName = `${pathParts.join('-')}-${fileNameWithoutExt}-${targetCommitHash}${fileExt}`;
        console.log(`Looking for target artifact: ${targetArtifactName}`);

        // Try to find and download target branch artifact
        try {
          const downloadResult = await downloadArtifactByCommitHash(
            targetCommitHash,
            fileName,
          );
          const downloadedBaselinePath = path.join(
            downloadResult.downloadPath,
            fileName,
          );
          baselineSizeData = loadSizeData(downloadedBaselinePath);
          console.log('✅ Successfully downloaded target branch artifact');
        } catch (downloadError) {
          console.log(
            'ℹ️  No baseline data found - target branch artifact does not exist',
          );
          console.log('📝 Using demo baseline data for comparison');

          // Use built-in demo data as baseline for comparison
          baselineSizeData = getDemoBaselineData();
          console.log('✅ Successfully loaded demo baseline data');
        }
      } catch (error) {
        console.warn(`⚠️  Failed to get target branch commit: ${error}`);
        console.log('📝 Using demo baseline data for comparison');

        // Use built-in demo data as baseline for comparison
        baselineSizeData = getDemoBaselineData();
        console.log('✅ Successfully loaded demo baseline data');
      }

      await generateSizeReport(currentSizeData, baselineSizeData || undefined);
    } else {
      console.log('🔄 Default behavior - uploading and downloading artifacts');

      const uploadResponse = await uploadArtifact(currentCommitHash, fullPath);

      if (typeof uploadResponse.id !== 'number') {
        throw new Error('Artifact upload failed: No artifact ID returned.');
      }

      console.log(
        `✅ Successfully uploaded artifact with ID: ${uploadResponse.id}`,
      );

      try {
        const targetCommitHash =
          await githubService.getTargetBranchLatestCommit();
        console.log(`Target branch commit hash: ${targetCommitHash}`);

        const targetArtifactName = `${pathParts.join('-')}-${fileNameWithoutExt}-${targetCommitHash}${fileExt}`;
        console.log(`Looking for target artifact: ${targetArtifactName}`);

        const downloadResult = await downloadArtifactByCommitHash(
          targetCommitHash,
          fileName,
        );
        const downloadedBaselinePath = path.join(
          downloadResult.downloadPath,
          fileName,
        );
        const baselineSizeData = loadSizeData(downloadedBaselinePath);

        // Generate report card
        const currentSizeData = loadSizeData(fullPath);
        if (currentSizeData) {
          await generateSizeReport(
            currentSizeData,
            baselineSizeData || undefined,
          );
        }

        console.log('✅ Successfully downloaded target branch artifact');
      } catch (error) {
        console.warn(`⚠️  Failed to download target branch artifact: ${error}`);
        console.log('📝 Using demo baseline data for comparison');

        const currentSizeData = loadSizeData(fullPath);
        if (currentSizeData) {
          const demoBaseline = getDemoBaselineData();
          await generateSizeReport(currentSizeData, demoBaseline);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    } else {
      setFailed(String(error));
    }
  }
})();
