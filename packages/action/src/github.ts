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

    // Get repository info from GitHub context
    const { context } = require('@actions/github');
    this.repository = {
      owner: context.repo.owner,
      repo: context.repo.repo,
    };
  }

  /**
   * Get the current commit hash
   */
  getCurrentCommitHash(): string {
    return execSync('git rev-parse --short=10 HEAD', {
      encoding: 'utf8',
    }).trim();
  }

  /**
   * Get the target branch name (default to main or master)
   */
  getTargetBranch(): string {
    const targetBranch = getInput('target_branch') || 'main';
    return targetBranch;
  }

  /**
   * List workflow runs for a specific branch
   */
  async listWorkflowRuns(params: WorkflowRunParams) {
    const { owner, repo } = this.repository;

    const runsResponse = await this.octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      branch: params.branch,
      status: params.status || 'completed',
      per_page: (params.limit || 10) + (params.skipCommits || 0),
    });

    return runsResponse.data;
  }

  /**
   * Get the latest commit hash from target branch
   */
  async getTargetBranchLatestCommit(): Promise<string> {
    const targetBranch = this.getTargetBranch();

    try {
      const runs = await this.listWorkflowRuns({
        branch: targetBranch,
        status: 'completed',
        limit: 1,
      });

      if (runs.workflow_runs && runs.workflow_runs.length > 0) {
        const latestRun = runs.workflow_runs[0];
        return latestRun.head_sha.substring(0, 10); // Get short hash
      }

      // Fallback: get commit hash directly from git
      return execSync(`git rev-parse --short=10 origin/${targetBranch}`, {
        encoding: 'utf8',
      }).trim();
    } catch (error) {
      console.warn(
        `Failed to get target branch commit from workflow runs, falling back to git: ${error}`,
      );
      // Fallback: get commit hash directly from git
      return execSync(`git rev-parse --short=10 origin/${targetBranch}`, {
        encoding: 'utf8',
      }).trim();
    }
  }

  /**
   * List artifacts for the repository
   */
  async listArtifacts() {
    const { owner, repo } = this.repository;

    const artifactsResponse =
      await this.octokit.rest.actions.listArtifactsForRepo({
        owner,
        repo,
        per_page: 100,
      });

    return artifactsResponse.data;
  }

  /**
   * Find artifact by name pattern (including commit hash)
   */
  async findArtifactByNamePattern(pattern: string) {
    const artifacts = await this.listArtifacts();

    return artifacts.artifacts.find((artifact) =>
      artifact.name.includes(pattern),
    );
  }

  /**
   * Download artifact by ID
   */
  async downloadArtifact(artifactId: number) {
    const { owner, repo } = this.repository;

    const downloadResponse = await this.octokit.rest.actions.downloadArtifact({
      owner,
      repo,
      artifact_id: artifactId,
      archive_format: 'zip',
    });

    return downloadResponse.data;
  }
}
