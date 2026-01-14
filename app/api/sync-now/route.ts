import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const syncToken = process.env.SYNC_TRIGGER_TOKEN;
  if (syncToken) {
    const provided = request.headers.get('x-sync-token');
    if (!provided || provided !== syncToken) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  const workflowToken = process.env.GITHUB_WORKFLOW_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const workflow = process.env.GITHUB_WORKFLOW_FILE ?? 'ingest.yml';
  const ref = process.env.GITHUB_REF ?? 'main';

  if (!workflowToken || !owner || !repo) {
    return NextResponse.json({ ok: false, error: 'Missing GitHub configuration' }, { status: 500 });
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${workflowToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({ ref })
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json({ ok: false, error: 'Dispatch failed', details }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
