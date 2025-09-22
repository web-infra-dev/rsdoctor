import { getOctokit } from '@actions/github';
import * as artifact from '@actions/artifact';

async function downloadArtifact() {
  try {
    // 初始化 GitHub API 客户端
    const token = process.env.GITHUB_TOKEN;
    const octokit = getOctokit(token);

    // 获取最近的工作流运行
    const runsResponse = await octokit.rest.actions.listWorkflowRuns({
      owner: 'yifancong',
      repo: 'bundle-actions',
      branch: 'main',
      status: 'completed',
      per_page: 1,
    });

    if (runsResponse.data.total_count === 0) {
      console.log('没有找到工作流运行记录');
      return;
    }

    // 获取构建产物列表
    const { data: artifacts } =
      await octokit.rest.actions.listWorkflowRunArtifacts({
        owner: 'yifancong',
        repo: 'bundle-actions',
        run_id: runsResponse.data.workflow_runs[0].id,
      });

    if (artifacts.total_count === 0) {
      console.log('没有找到构建产物');
      return;
    }

    // 下载构建产物
    const artifactClient = artifact.create();
    const downloadResponse = await artifactClient.downloadArtifact(
      artifacts.artifacts[0].id,
    );

    // 解析并打印大小数据
    const sizeData = JSON.parse(downloadResponse.toString());
    console.log('构建产物大小数据：', sizeData);
  } catch (error) {
    console.error('下载构建产物时出错：', error);
  }
}

downloadArtifact();
