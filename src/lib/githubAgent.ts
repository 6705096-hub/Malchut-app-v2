const OWNER = '6705096-hub';
const REPO = 'Malchut-app';
const BRANCH = 'main';

const getHeaders = () => {
  const token = process.env.GITHUB_PAT;
  if (!token) throw new Error('GITHUB_PAT is not defined in environment variables');
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Catering-CMS-Agent'
  };
};

/**
 * Searches for files in the GitHub repository.
 * Falls back to tree search if Search API is rate limited.
 */
export async function searchGithubFiles(query: string) {
  try {
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}+in:file,path+repo:${OWNER}/${REPO}`;
    const res = await fetch(url, { headers: getHeaders() });
    
    if (!res.ok) {
      if (res.status === 403) {
        // Fallback to tree search on rate limit
        return await searchTreeFallback(query);
      }
      throw new Error(`GitHub Search API failed: ${await res.text()}`);
    }
    
    const data = await res.json();
    return data.items.map((item: any) => item.path);
  } catch (err) {
    // If standard search fails or throws, try tree fallback
    return await searchTreeFallback(query);
  }
}

async function searchTreeFallback(query: string) {
  const tree = await getProjectTree();
  if (!tree) return [];
  const qLower = query.toLowerCase();
  
  return tree.filter((path: string) => path.toLowerCase().includes(qLower) || qLower.includes(path.split('/').pop()?.toLowerCase() || ''));
}

/**
 * Returns a list of all relevant files in the repository.
 * This is incredibly useful for giving the AI Agent a map of the codebase.
 */
export async function getProjectTree() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.tree) return null;
  
  // Filter out node_modules, .next, and hidden files
  return data.tree
    .filter((t: any) => t.type === 'blob' && !t.path.includes('node_modules') && !t.path.includes('.next') && !t.path.startsWith('.'))
    .map((t: any) => t.path);
}

/**
 * Reads a file from the GitHub repository.
 * Returns the text content and the file SHA (needed for updates).
 */
export async function readGithubFile(filePath: string, branch = BRANCH) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${branch}`;
  const res = await fetch(url, { headers: getHeaders() });
  
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to read file from GitHub: ${await res.text()}`);
  
  const data = await res.json();
  if (data.type !== 'file' || !data.content) throw new Error('Requested path is not a file');
  
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content, sha: data.sha };
}

/**
 * Writes or updates a file in the GitHub repository.
 * If the file exists, it fetches the current SHA to allow overwriting.
 */
export async function writeGithubFile(filePath: string, content: string, commitMessage: string, branch = BRANCH) {
  // 1. Get current SHA if it exists
  let sha: string | undefined;
  try {
    const current = await readGithubFile(filePath, branch);
    if (current) sha = current.sha;
  } catch (e) {
    // Ignore error, assume new file or let PUT handle it
  }
  
  // 2. Write file
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: commitMessage,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      sha, // Send SHA only if updating existing file
      branch: branch
    })
  });
  
  if (!res.ok) {
     const text = await res.text();
     console.error('GitHub Write Error:', text);
     throw new Error(`Failed to write file to GitHub: ${res.statusText}`);
  }
  
  return await res.json();
}

/**
 * Gets the latest commit SHA for a branch.
 */
export async function getBranchSha(branchName = BRANCH) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${branchName}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Failed to get branch SHA: ${await res.text()}`);
  const data = await res.json();
  return data.object.sha;
}

/**
 * Creates a new branch from a specific SHA.
 */
export async function createBranch(newBranchName: string, fromSha: string) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/git/refs`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref: `refs/heads/${newBranchName}`,
      sha: fromSha
    })
  });
  if (!res.ok) throw new Error(`Failed to create branch: ${await res.text()}`);
  return await res.json();
}

/**
 * Creates a Pull Request.
 */
export async function createPullRequest(title: string, body: string, headBranch: string, baseBranch = BRANCH) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/pulls`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      body,
      head: headBranch,
      base: baseBranch
    })
  });
  if (!res.ok) throw new Error(`Failed to create PR: ${await res.text()}`);
  return await res.json();
}

/**
 * Merges a Pull Request.
 */
export async function mergePullRequest(pullNumber: number) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/pulls/${pullNumber}/merge`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commit_title: `Merge PR #${pullNumber} (Preview approved)`
    })
  });
  if (!res.ok) throw new Error(`Failed to merge PR: ${await res.text()}`);
  return await res.json();
}
