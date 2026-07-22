export interface Repository {
  id: number;
  name: string;
  description: string | null;
  pushed_at: string;
  owner: {
    login: string;
  };
}

export interface RepoPage {
  repos: Repository[];
  hasMore: boolean;
}

export const DEFAULT_USERNAME = "jaredsburrows";
export const REPOS_PER_PAGE = 100;

// GitHub usernames: alphanumeric or single hyphens, no leading/trailing hyphen, max 39 chars.
export const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
// GitHub repository names: alphanumeric, dot, underscore, hyphen.
export const REPO_NAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

const GITHUB_API_URL = "https://api.github.com/users";

interface RawRepository {
  id: number;
  name: string;
  description: string | null;
  has_pages: boolean;
  pushed_at: string;
  owner: {
    login: string;
  };
}

// Keep only GitHub Pages repos and only the fields the UI needs; the raw API
// objects are ~100 fields each and would bloat the prerendered HTML and the
// client cache with data that never renders.
function toRepositories(raw: RawRepository[]): Repository[] {
  return raw
    .filter((repo) => repo.has_pages)
    .map((repo) => ({
      id: repo.id,
      name: repo.name,
      description: repo.description,
      pushed_at: repo.pushed_at,
      owner: {login: repo.owner.login},
    }));
}

export async function fetchRepoPage(
  username: string,
  page: number,
  options: { signal?: AbortSignal; token?: string } = {},
): Promise<RepoPage> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const params = `sort=pushed&direction=desc&per_page=${REPOS_PER_PAGE}&page=${page}`;
  const response = await fetch(
    `${GITHUB_API_URL}/${encodeURIComponent(username)}/repos?${params}`,
    { headers, signal: options.signal },
  );

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error("GitHub API rate limit reached. Please try again in a few minutes.");
    }
    if (response.status === 404) {
      throw new Error(`GitHub user "${username}" was not found.`);
    }
    throw new Error(`Error fetching repositories: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RawRepository[];
  // hasMore reflects the raw page, not the filtered subset: a page full of
  // non-Pages repos must still keep pagination going.
  const linkHeader = response.headers.get("link");
  const hasMore = linkHeader
    ? /rel="next"/.test(linkHeader)
    : data.length === REPOS_PER_PAGE;

  return { repos: toRepositories(data), hasMore };
}

export function mergeRepos(existing: Repository[], incoming: Repository[]): Repository[] {
  const seen = new Set(existing.map((repo) => repo.id));
  return [...existing, ...incoming.filter((repo) => !seen.has(repo.id))];
}

// Repository values may come from localStorage, which on <user>.github.io is
// same-origin with every other GitHub Pages project site of that user — treat
// it as untrusted and validate before rendering or building URLs from it.
export function isValidRepository(value: unknown): value is Repository {
  if (typeof value !== "object" || value === null) return false;
  const repo = value as Partial<Repository>;
  return (
    typeof repo.id === "number" &&
    typeof repo.name === "string" &&
    REPO_NAME_PATTERN.test(repo.name) &&
    (repo.description === null || typeof repo.description === "string") &&
    typeof repo.pushed_at === "string" &&
    typeof repo.owner === "object" &&
    repo.owner !== null &&
    typeof repo.owner.login === "string" &&
    USERNAME_PATTERN.test(repo.owner.login)
  );
}

export function pagesUrl(repo: Repository): string {
  const owner = repo.owner.login;
  // The <owner>.github.io repo is served at the root, not under a subpath.
  return repo.name.toLowerCase() === `${owner.toLowerCase()}.github.io`
    ? `https://${owner}.github.io/`
    : `https://${owner}.github.io/${repo.name}/`;
}
