import {afterEach, describe, expect, it, vi} from "vitest";
import {
  REPOS_PER_PAGE,
  REPO_NAME_PATTERN,
  USERNAME_PATTERN,
  fetchRepoPage,
  isValidRepository,
  mergeRepos,
  repoUrl,
  type Repository,
} from "./github";

function repo(overrides: Partial<Repository> = {}): Repository {
  return {
    id: 1,
    name: "gradle-license-plugin",
    description: "A plugin",
    pushed_at: "2026-07-01T00:00:00Z",
    has_pages: true,
    owner: {login: "jaredsburrows"},
    ...overrides,
  };
}

// Raw API objects carry many extra fields; include a couple to prove slimming.
function rawRepo(overrides: object = {}) {
  return {
    id: 1,
    name: "gradle-license-plugin",
    full_name: "jaredsburrows/gradle-license-plugin",
    description: "A plugin",
    pushed_at: "2026-07-01T00:00:00Z",
    has_pages: true,
    html_url: "https://github.com/jaredsburrows/gradle-license-plugin",
    owner: {login: "jaredsburrows", avatar_url: "https://example.com/a.png"},
    ...overrides,
  };
}

describe("USERNAME_PATTERN", () => {
  it("accepts real usernames", () => {
    for (const name of ["jaredsburrows", "a", "octo-cat", "user123", "A1-b2-c3"]) {
      expect(USERNAME_PATTERN.test(name)).toBe(true);
    }
  });

  it("rejects names that could escape a URL host or path", () => {
    for (const name of [
      "evil.com/x",
      "../evil",
      "user name",
      "-leading",
      "trailing-",
      "double--hyphen",
      "a".repeat(40),
      "",
      "user/../..",
    ]) {
      expect(USERNAME_PATTERN.test(name)).toBe(false);
    }
  });
});

describe("REPO_NAME_PATTERN", () => {
  it("accepts real repo names", () => {
    for (const name of ["repo", "my.repo", "my_repo", "my-repo", "R2.d2_x-1"]) {
      expect(REPO_NAME_PATTERN.test(name)).toBe(true);
    }
  });

  it("rejects path or host escapes", () => {
    for (const name of ["a/b", "a b", "a?b", "a#b", "", "a".repeat(101)]) {
      expect(REPO_NAME_PATTERN.test(name)).toBe(false);
    }
  });
});

describe("repoUrl", () => {
  it("links Pages repos to the live site", () => {
    expect(repoUrl(repo())).toBe("https://jaredsburrows.github.io/gradle-license-plugin/");
  });

  it("links the <owner>.github.io repo to the root", () => {
    expect(repoUrl(repo({name: "jaredsburrows.github.io"}))).toBe("https://jaredsburrows.github.io/");
    expect(
      repoUrl(repo({name: "JaredsBurrows.github.io", owner: {login: "jaredsburrows"}})),
    ).toBe("https://jaredsburrows.github.io/");
  });

  it("links non-Pages repos to GitHub", () => {
    expect(repoUrl(repo({has_pages: false}))).toBe(
      "https://github.com/jaredsburrows/gradle-license-plugin",
    );
  });

  it("refuses to build a URL from values that fail validation", () => {
    expect(repoUrl(repo({owner: {login: "evil.com/x"}}))).toBe("#");
    expect(repoUrl(repo({name: "a/b"}))).toBe("#");
  });
});

describe("mergeRepos", () => {
  it("appends new repos and drops duplicates by id", () => {
    const merged = mergeRepos(
      [repo({id: 1}), repo({id: 2})],
      [repo({id: 2}), repo({id: 3})],
    );
    expect(merged.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

describe("isValidRepository", () => {
  it("accepts a well-formed repository", () => {
    expect(isValidRepository(repo())).toBe(true);
    expect(isValidRepository(repo({description: null}))).toBe(true);
  });

  it("rejects malformed or hostile cache entries", () => {
    expect(isValidRepository(null)).toBe(false);
    expect(isValidRepository("string")).toBe(false);
    expect(isValidRepository(repo({id: "1" as unknown as number}))).toBe(false);
    expect(isValidRepository(repo({name: "evil/../path"}))).toBe(false);
    expect(isValidRepository(repo({owner: {login: "evil.com/x"}}))).toBe(false);
    expect(isValidRepository(repo({has_pages: "yes" as unknown as boolean}))).toBe(false);
    expect(isValidRepository({...repo(), owner: null})).toBe(false);
  });
});

describe("fetchRepoPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {"content-type": "application/json"},
      ...init,
    });
  }

  it("slims repos to the fields the UI needs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([rawRepo()]));
    vi.stubGlobal("fetch", fetchMock);

    const page = await fetchRepoPage("jaredsburrows", 1);
    expect(page.repos).toEqual([repo()]);
    expect(page.repos[0]).not.toHaveProperty("html_url");
    expect(page.repos[0].owner).not.toHaveProperty("avatar_url");
  });

  it("requests pushed-descending order and encodes the username", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchRepoPage("weird name", 2);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/users/weird%20name/repos");
    expect(url).toContain("sort=pushed");
    expect(url).toContain("direction=desc");
    expect(url).toContain(`per_page=${REPOS_PER_PAGE}`);
    expect(url).toContain("page=2");
  });

  it("reads hasMore from the Link header when present", async () => {
    const withNext = jsonResponse([rawRepo()], {
      headers: {link: '<https://api.github.com/x?page=2>; rel="next"'},
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(withNext));
    expect((await fetchRepoPage("user", 1)).hasMore).toBe(true);

    const lastPage = jsonResponse([rawRepo()], {
      headers: {link: '<https://api.github.com/x?page=1>; rel="prev"'},
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(lastPage));
    expect((await fetchRepoPage("user", 2)).hasMore).toBe(false);
  });

  it("falls back to page-size heuristic without a Link header", async () => {
    const fullPage = Array.from({length: REPOS_PER_PAGE}, (_, i) => rawRepo({id: i + 1}));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(fullPage)));
    expect((await fetchRepoPage("user", 1)).hasMore).toBe(true);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([rawRepo()])));
    expect((await fetchRepoPage("user", 1)).hasMore).toBe(false);
  });

  it("maps 404 and rate-limit statuses to friendly errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", {status: 404})));
    await expect(fetchRepoPage("nosuchuser", 1)).rejects.toThrow(
      'GitHub user "nosuchuser" was not found.',
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", {status: 403})));
    await expect(fetchRepoPage("user", 1)).rejects.toThrow(/rate limit/i);
  });

  it("retries once on server errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", {status: 500}))
      .mockResolvedValueOnce(jsonResponse([rawRepo()]));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchRepoPage("user", 1);
    const page = await promise;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(page.repos).toHaveLength(1);
  });

  it("does not retry client errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", {status: 404}));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchRepoPage("user", 1)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
