export interface GitHubRepoParts {
  owner: string
  repo: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string | null
  state: string
  labels: unknown[]
  html_url: string
  pull_request?: unknown
}

export interface GitHubMergeResult {
  merged: boolean
  message?: string
  sha?: string
}

export function parseGitHubRepoUrl(url: string): GitHubRepoParts | null {
  const trimmedUrl = url.trim()

  if (!trimmedUrl) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedUrl)
    const hostname = parsedUrl.hostname.toLowerCase()

    if (hostname !== 'github.com' && hostname !== 'www.github.com') {
      return null
    }

    const [owner, repo] = parsedUrl.pathname
      .split('/')
      .filter(Boolean)

    if (!owner || !repo) {
      return null
    }

    return {
      owner,
      repo: repo.replace(/\.git$/, ''),
    }
  } catch {
    return null
  }
}

export function parseGitHubPullRequestNumber(value: string): number | null {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  if (/^\d+$/.test(trimmedValue)) {
    return Number(trimmedValue)
  }

  try {
    const parsedUrl = new URL(trimmedValue)
    const [, owner, repo, pullsSegment, pullNumber] = parsedUrl.pathname.split('/')

    if (
      parsedUrl.hostname.toLowerCase().replace(/^www\./, '') !== 'github.com' ||
      !owner ||
      !repo ||
      pullsSegment !== 'pull' ||
      !pullNumber ||
      !/^\d+$/.test(pullNumber)
    ) {
      return null
    }

    return Number(pullNumber)
  } catch {
    return null
  }
}

export async function fetchOpenGitHubIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10',
  }

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&per_page=100`,
    { headers },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${errorText}`)
  }

  const issues = await response.json() as GitHubIssue[]

  return issues.filter((issue) => !issue.pull_request)
}

export async function mergeGitHubPullRequest(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<GitHubMergeResult> {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN é obrigatório para fazer merge de Pull Request.')
  }

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/merge`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2026-03-10',
      },
    },
  )

  const result = await response.json().catch(() => ({})) as GitHubMergeResult

  if (!response.ok) {
    throw new Error(result.message || `GitHub API error ${response.status}`)
  }

  return result
}
