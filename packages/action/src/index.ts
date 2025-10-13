import { setFailed, getInput } from '@actions/core';
import { uploadArtifact } from './upload';
import { downloadArtifactByCommitHash } from './download';
import { GitHubService } from './github';
import {
  loadSizeData,
  generateSizeReport,
  parseRsdoctorData,
  generateBundleAnalysisReport,
  BundleAnalysis,
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

    try {
      await githubService.verifyTokenPermissions();
    } catch (permissionError) {
      console.warn(
        `⚠️  Token permission check failed: ${permissionError.message}`,
      );
      console.log(`🔄 Continuing with limited functionality...`);
    }

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

    const currentCommitHash = githubService.getCurrentCommitHash();
    console.log(`Current commit hash: ${currentCommitHash}`);

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

      const currentBundleAnalysis = parseRsdoctorData(fullPath);
      if (currentBundleAnalysis) {
        await generateBundleAnalysisReport(currentBundleAnalysis);
      } else {
        const currentSizeData = loadSizeData(fullPath);
        if (currentSizeData) {
          await generateSizeReport(currentSizeData);
        }
      }
    } else if (isPullRequestEvent()) {
      console.log(
        '📥 Detected pull request event - downloading target branch artifact if exists',
      );

      const currentBundleAnalysis = parseRsdoctorData(fullPath);
      if (!currentBundleAnalysis) {
        throw new Error(
          `Failed to load current bundle analysis from: ${fullPath}`,
        );
      }

      let baselineBundleAnalysis: BundleAnalysis | null = null;

      try {
        console.log('🔍 Getting target branch commit hash...');
        const targetCommitHash =
          await githubService.getTargetBranchLatestCommit();
        console.log(`✅ Target branch commit hash: ${targetCommitHash}`);

        const targetArtifactName = `${pathParts.join('-')}-${fileNameWithoutExt}-${targetCommitHash}${fileExt}`;
        console.log(`🔍 Looking for target artifact: ${targetArtifactName}`);

        try {
          console.log('📥 Attempting to download target branch artifact...');
          const downloadResult = await downloadArtifactByCommitHash(
            targetCommitHash,
            fileName,
          );
          const downloadedBaselinePath = path.join(
            downloadResult.downloadPath,
            fileName,
          );

          console.log(
            `📁 Downloaded baseline file path: ${downloadedBaselinePath}`,
          );
          console.log(`📊 Parsing baseline rsdoctor data...`);

          baselineBundleAnalysis = parseRsdoctorData(downloadedBaselinePath);
          if (!baselineBundleAnalysis) {
            throw new Error('Failed to parse baseline rsdoctor data');
          }
          console.log(
            '✅ Successfully downloaded and parsed target branch artifact',
          );
        } catch (downloadError) {
          console.log(
            `❌ Failed to download target branch artifact: ${downloadError}`,
          );
          console.log(
            'ℹ️  No baseline data found - target branch artifact does not exist',
          );
          console.log('📝 No baseline data available for comparison');
          baselineBundleAnalysis = null;
        }
      } catch (error) {
        console.error(`❌ Failed to get target branch commit: ${error}`);
        console.log('📝 No baseline data available for comparison');
        baselineBundleAnalysis = null;
      }

      await generateBundleAnalysisReport(
        currentBundleAnalysis,
        baselineBundleAnalysis || undefined,
      );
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
        const baselineBundleAnalysis = parseRsdoctorData(
          downloadedBaselinePath,
        );

        const currentBundleAnalysis = parseRsdoctorData(fullPath);
        if (currentBundleAnalysis) {
          await generateBundleAnalysisReport(
            currentBundleAnalysis,
            baselineBundleAnalysis || undefined,
          );
        } else {
          const currentSizeData = loadSizeData(fullPath);
          const baselineSizeData = loadSizeData(downloadedBaselinePath);
          if (currentSizeData) {
            await generateSizeReport(
              currentSizeData,
              baselineSizeData || undefined,
            );
          }
        }

        console.log('✅ Successfully downloaded target branch artifact');
      } catch (error) {
        console.warn(`⚠️  Failed to download target branch artifact: ${error}`);
        console.log('📝 Using demo baseline data for comparison');

        const currentBundleAnalysis = parseRsdoctorData(fullPath);
        if (currentBundleAnalysis) {
          await generateBundleAnalysisReport(currentBundleAnalysis);
        } else {
          const currentSizeData = loadSizeData(fullPath);
          if (currentSizeData) {
            await generateSizeReport(currentSizeData);
          }
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
