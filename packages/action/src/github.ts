import { getInput } from '@actions/core';
import { getOctokit } from '@actions/github';
import { execSync } from 'child_process';

export interface Repository {
  owner: string;
  repo: string;
}

export interface WorkflowRunParams {
  branch: string;
  status?: 'completed' | 'in_progress' | 'queued' | 'requested';
  limit?: number;
  skipCommits?: number;
}

export class GitHubService {
  private octokit: any;
  private repository: Repository;

  constructor() {
    this.octokit = getOctokit(getInput('github_token', { required: true }));
    
    const { context } = require('@actions/github');
    this.repository = {
      owner: context.repo.owner,
      repo: context.repo.repo
    };
    
    console.log(`🔧 GitHub Service initialized for: ${this.repository.owner}/${this.repository.repo}`);
  }

  getCurrentCommitHash(): string {
    return execSync('git rev-parse --short=10 HEAD', { encoding: 'utf8' }).trim();
  }

  getTargetBranch(): string {
    const targetBranch = getInput('target_branch') || 'main';
    return targetBranch;
  }

  async listWorkflowRuns(params: WorkflowRunParams) {
    const { owner, repo } = this.repository;
    
    const runsResponse = await this.octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      branch: params.branch,
      status: params.status || 'completed',
      per_page: (params.limit || 10) + (params.skipCommits || 0)
    });

    return runsResponse.data;
  }

  async getTargetBranchLatestCommit(): Promise<string> {
    const targetBranch = this.getTargetBranch();
    console.log(`🔍 Attempting to get latest commit for target branch: ${targetBranch}`);
    console.log(`📋 Repository: ${this.repository.owner}/${this.repository.repo}`);
    
    try {
      console.log(`📡 Trying to get latest commit from GitHub API...`);
      const { owner, repo } = this.repository;
      
      try {
        const branchResponse = await this.octokit.rest.repos.getBranch({
          owner,
          repo,
          branch: targetBranch
        });
        
        if (branchResponse.data && branchResponse.data.commit) {
          const commitHash = branchResponse.data.commit.sha.substring(0, 10);
          console.log(`✅ Found commit hash from GitHub API: ${commitHash}`);
          return commitHash;
        }
      } catch (apiError) {
        console.warn(`⚠️  GitHub API failed: ${apiError.message}`);
        
        const alternativeBranches = ['master', 'main', 'develop'];
        for (const altBranch of alternativeBranches) {
          if (altBranch !== targetBranch) {
            try {
              console.log(`🔄 Trying alternative branch: ${altBranch}`);
              const altResponse = await this.octokit.rest.repos.getBranch({
                owner,
                repo,
                branch: altBranch
              });
              
              if (altResponse.data && altResponse.data.commit) {
                const commitHash = altResponse.data.commit.sha.substring(0, 10);
                console.log(`✅ Found commit hash from alternative branch ${altBranch}: ${commitHash}`);
                return commitHash;
              }
            } catch (altError) {
              console.log(`❌ Alternative branch ${altBranch} also failed: ${altError.message}`);
            }
          }
        }
      }

      console.log(`📋 Trying to get from workflow runs...`);
      try {
        const runs = await this.listWorkflowRuns({
          branch: targetBranch,
          status: 'completed',
          limit: 10
        });

        if (runs.workflow_runs && runs.workflow_runs.length > 0) {
          console.log(`Found ${runs.workflow_runs.length} workflow runs for ${targetBranch}`);
          
          const successfulRun = runs.workflow_runs.find(run => run.conclusion === 'success');
          if (successfulRun) {
            console.log(`✅ Found successful workflow run for ${targetBranch}: ${successfulRun.head_sha}`);
            return successfulRun.head_sha.substring(0, 10);
          }
          
          const latestRun = runs.workflow_runs[0];
          console.log(`⚠️  No successful runs found, using latest workflow run for ${targetBranch}: ${latestRun.head_sha}`);
          return latestRun.head_sha.substring(0, 10);
        }
      } catch (workflowError) {
        console.warn(`⚠️  Failed to get workflow runs: ${workflowError.message}`);
      }

      console.log(`🔧 No workflow runs found for ${targetBranch}, trying to fetch from remote...`);
      try {
        console.log(`📥 Running: git fetch origin`);
        execSync('git fetch origin', { encoding: 'utf8' });
        
        console.log(`📥 Running: git rev-parse --short=10 origin/${targetBranch}`);
        const commitHash = execSync(`git rev-parse --short=10 origin/${targetBranch}`, { encoding: 'utf8' }).trim();
        console.log(`✅ Found commit hash from git: ${commitHash}`);
        return commitHash;
      } catch (gitError) {
        console.warn(`❌ Git fetch failed: ${gitError}`);
        
        try {
          console.log(`📥 Trying alternative: git ls-remote origin ${targetBranch}`);
          const remoteRef = execSync(`git ls-remote origin ${targetBranch}`, { encoding: 'utf8' }).trim();
          if (remoteRef) {
            const commitHash = remoteRef.split('\t')[0].substring(0, 10);
            console.log(`✅ Found commit hash from git ls-remote: ${commitHash}`);
            return commitHash;
          }
        } catch (altError) {
          console.warn(`❌ Alternative git command failed: ${altError}`);
        }
      }

      console.error(`❌ All methods to get target branch commit have failed`);
      throw new Error(`Unable to get target branch (${targetBranch}) commit hash. Please ensure the branch exists and you have correct permissions.`);
      
    } catch (error) {
      console.error(`❌ Failed to get target branch commit: ${error}`);
      console.error(`Repository: ${this.repository.owner}/${this.repository.repo}`);
      console.error(`Target branch: ${targetBranch}`);
      
      throw new Error(`Failed to get target branch (${targetBranch}) commit: ${error.message}`);
    }
  }

  async listArtifacts() {
    const { owner, repo } = this.repository;
    
    const artifactsResponse = await this.octokit.rest.actions.listArtifactsForRepo({
      owner,
      repo,
      per_page: 100
    });

    return artifactsResponse.data;
  }

  async findArtifactByNamePattern(pattern: string) {
    const artifacts = await this.listArtifacts();
    
    console.log(`Looking for artifacts matching pattern: ${pattern}`);
    console.log(`Available artifacts: ${artifacts.artifacts.map(a => a.name).join(', ')}`);
    
    const matchingArtifacts = artifacts.artifacts.filter(artifact => 
      artifact.name.includes(pattern)
    );
    
    if (matchingArtifacts.length > 0) {
      console.log(`Found ${matchingArtifacts.length} matching artifacts:`, matchingArtifacts.map(a => a.name));
      return matchingArtifacts.sort((a, b) => b.id - a.id)[0];
    }
    
    console.log(`No artifacts found matching pattern: ${pattern}`);
    return null;
  }

  async downloadArtifact(artifactId: number) {
    const { owner, repo } = this.repository;
    
    const downloadResponse = await this.octokit.rest.actions.downloadArtifact({
      owner,
      repo,
      artifact_id: artifactId,
      archive_format: 'zip'
    });

    return downloadResponse.data;
  }
}
