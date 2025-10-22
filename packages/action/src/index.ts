import { setFailed, getInput, summary } from '@actions/core';
import { uploadArtifact } from './upload';
import { downloadArtifactByCommitHash } from './download';
import { GitHubService } from './github';
import { loadSizeData, generateSizeReport, parseRsdoctorData, generateBundleAnalysisReport, generateBundleAnalysisMarkdown, BundleAnalysis } from './report';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { spawnSync } from 'child_process';
const execFileAsync = promisify(execFile);

function isMergeEvent(): boolean {
  const { context } = require('@actions/github');
  return context.eventName === 'push' && context.payload.ref === `refs/heads/${context.payload.repository.default_branch}`;
}

function isPullRequestEvent(): boolean {
  const { context } = require('@actions/github');
  return context.eventName === 'pull_request';
}

function runRsdoctorViaNode(requirePath: string, args: string[] = []) {
  const nodeExec = process.execPath; // 当前 node 可执行文件的绝对路径
  console.log('process.execPath =', nodeExec);
  console.log('Running:', nodeExec, requirePath, args.join(' '));
  const r = spawnSync(nodeExec, [requirePath, ...args], { stdio: 'inherit' });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`rsdoctor exited with code ${r.status}`);
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
    
    const currentCommitHash = githubService.getCurrentCommitHash();
    console.log(`Current commit hash: ${currentCommitHash}`);
    
    const artifactNamePattern = `${pathParts.join('-')}-${fileNameWithoutExt}-`;
    console.log(`Artifact name pattern: ${artifactNamePattern}`);
    
    if (isMergeEvent()) {
      console.log('🔄 Detected merge event - uploading current branch artifact only');
      
      const uploadResponse = await uploadArtifact(fullPath, currentCommitHash);
      
      if (typeof uploadResponse.id !== 'number') {
        throw new Error('Artifact upload failed: No artifact ID returned.');
      }
      
      console.log(`✅ Successfully uploaded artifact with ID: ${uploadResponse.id}`);
      
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
      console.log('📥 Detected pull request event - downloading target branch artifact if exists');
      
      const currentBundleAnalysis = parseRsdoctorData(fullPath);
      if (!currentBundleAnalysis) {
        throw new Error(`Failed to load current bundle analysis from: ${fullPath}`);
      }
      
      let baselineBundleAnalysis: BundleAnalysis | null = null;
      let baselineJsonPath: string | null = null;
      
      try {
        console.log('🔍 Getting target branch commit hash...');
        const targetCommitHash = await githubService.getTargetBranchLatestCommit();
        console.log(`✅ Target branch commit hash: ${targetCommitHash}`);
        
        const targetArtifactName = `${pathParts.join('-')}-${fileNameWithoutExt}-${targetCommitHash}${fileExt}`;
        console.log(`🔍 Looking for target artifact: ${targetArtifactName}`);
        
        try {
          console.log('📥 Attempting to download target branch artifact...');
          const downloadResult = await downloadArtifactByCommitHash(targetCommitHash, fileName);
          const downloadedBaselinePath = path.join(downloadResult.downloadPath, fileName);
          baselineJsonPath = downloadedBaselinePath;
          
          console.log(`📁 Downloaded baseline file path: ${downloadedBaselinePath}`);
          console.log(`📊 Parsing baseline rsdoctor data...`);
          
          baselineBundleAnalysis = parseRsdoctorData(downloadedBaselinePath);
          if (!baselineBundleAnalysis) {
            throw new Error('Failed to parse baseline rsdoctor data');
          }
          console.log('✅ Successfully downloaded and parsed target branch artifact');
        } catch (downloadError) {
          console.log(`❌ Failed to download target branch artifact: ${downloadError}`);
          console.log('ℹ️  No baseline data found - target branch artifact does not exist');
          console.log('📝 No baseline data available for comparison');
          baselineBundleAnalysis = null;
        }
        
      } catch (error) {
        console.error(`❌ Failed to get target branch commit: ${error}`);
        console.log('📝 No baseline data available for comparison');
        baselineBundleAnalysis = null;
      }
      
      // Generate rsdoctor HTML diff if baseline JSON exists
      try {
        if (baselineJsonPath) {
          const tempOutDir = process.cwd();
          
          try {
            // 尝试定位包的入口（安装到工作区 node_modules 的情况下）
            const cliEntry = require.resolve('@rsdoctor/cli', { paths: [process.cwd()] });
            const binCliEntry = path.join(path.dirname(path.dirname(cliEntry)), 'bin', 'rsdoctor');
            console.log(`🔍 Found rsdoctor CLI at: ${binCliEntry}`);
            
            runRsdoctorViaNode(binCliEntry, [
              'bundle-diff', 
              '--html', 
              `--baseline=${baselineJsonPath}`, 
              `--current=${fullPath}`
            ]);
          } catch (e) {
            console.log(`⚠️ rsdoctor CLI not found in node_modules: ${e}`);
            
            // Fallback: try npx approach
            try {
              const shellCmd = `npx @rsdoctor/cli bundle-diff --html --baseline="${baselineJsonPath}" --current="${fullPath}"`;
              console.log(`🛠️ Running rsdoctor via npx: ${shellCmd}`);
              await execFileAsync('sh', ['-c', shellCmd], { cwd: tempOutDir });
            } catch (npxError) {
              console.log(`⚠️ npx approach also failed: ${npxError}`);
              throw new Error(`Failed to run rsdoctor: ${e.message}`);
            }
          }

          // Heuristically locate generated HTML in output dir
          const diffHtmlPath = path.join(tempOutDir, 'rsdoctor-diff.html');
          try {
            // Upload diff html as artifact
            const uploadRes = await uploadArtifact(diffHtmlPath, currentCommitHash);
            console.log(`✅ Uploaded bundle diff HTML, artifact id: ${uploadRes.id}`);

            const runLink = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
            
            // Add to GitHub summary
            await summary
              .addHeading('🧮 Bundle Diff (Rsdoctor)', 3)
              .addLink('Open workflow run to download the diff HTML', runLink)
              .addSeparator();

            // Add comment to PR if this is a pull request
            if (isPullRequestEvent()) {
              const { context } = require('@actions/github');
              const octokit = require('@actions/github').getOctokit(getInput('github_token', { required: true }));
              
              // Generate bundle analysis markdown for PR comment
              const bundleAnalysisMarkdown = generateBundleAnalysisMarkdown(currentBundleAnalysis, baselineBundleAnalysis || undefined);
              
              const commentBody = `## Rsdoctor Bundle Diff Analysis
              
  A detailed bundle diff analysis has been generated using Rsdoctor. You can download and view the interactive HTML report from the workflow artifacts.

  📦 **Download Link**: [Download Bundle Diff Report](${runLink})

  ${bundleAnalysisMarkdown}

  *Generated by Bundle Size Action*`;

              try {
                await octokit.rest.issues.createComment({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  issue_number: context.payload.pull_request.number,
                  body: commentBody
                });
                console.log('✅ Added bundle diff comment to PR');
              } catch (commentError) {
                console.warn(`⚠️ Failed to add comment to PR: ${commentError}`);
              }
            }
          } catch (e) {
            console.warn(`⚠️ Failed to upload or link rsdoctor diff html: ${e}`);
          }
        }
      } catch (e) {
        console.warn(`⚠️ rsdoctor bundle-diff failed: ${e}`);
      }

      await generateBundleAnalysisReport(currentBundleAnalysis, baselineBundleAnalysis || undefined);
      
    } else {
      console.log('ℹ️ Skipping artifact operations - this action only runs on merge events and pull requests');
      console.log('Current event:', process.env.GITHUB_EVENT_NAME);
      return;
    }

  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    } else {
      setFailed(String(error));
    }
  }
})();
