"use client";

import React, {useCallback, useEffect, useRef, useState} from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Container,
  InputBase,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import {
  DEFAULT_USERNAME,
  USERNAME_PATTERN,
  fetchRepoPage,
  isValidRepository,
  mergeRepos,
  pagesUrl,
  type RepoPage,
  type Repository,
} from "@/lib/github";

const DEBOUNCE_MS = 400;
const CACHE_TTL_MS = 10 * 60 * 1000;
// v2: entries are pre-filtered to GitHub Pages repos with a slimmed field set.
const CACHE_PREFIX = "gh-repos:v2:";

// One session per username: every request belongs to a session and is ignored
// once that session is replaced, so late responses can never write another
// username's state or cache (or a stale merge over a fresh refresh).
interface Session {
  name: string;
  controller: AbortController;
}

interface CachedRepos {
  ts: number;
  repos: Repository[];
  page: number;
  hasMore: boolean;
}

// localStorage on <user>.github.io is same-origin with the user's other GitHub
// Pages sites, so entries are untrusted input: validate shape and content.
function readCache(username: string): CachedRepos | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + username.toLowerCase());
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<CachedRepos>;
    if (
      typeof cached.ts !== "number" ||
      typeof cached.page !== "number" ||
      typeof cached.hasMore !== "boolean" ||
      !Array.isArray(cached.repos) ||
      cached.repos.length > 5000 ||
      !cached.repos.every(isValidRepository)
    ) {
      return null;
    }
    return cached as CachedRepos;
  } catch {
    return null;
  }
}

function writeCache(username: string, value: Omit<CachedRepos, "ts">): void {
  try {
    window.localStorage.setItem(
      CACHE_PREFIX + username.toLowerCase(),
      JSON.stringify({ts: Date.now(), ...value}),
    );
  } catch {
    // Storage may be full or unavailable (e.g. private browsing); caching is best-effort.
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat("en", {numeric: "auto"});
const TIME_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

function formatRelativeTime(iso: string): string {
  const diff = Date.parse(iso) - Date.now();
  if (Number.isNaN(diff)) return "";
  for (const [unit, ms] of TIME_UNITS) {
    if (Math.abs(diff) >= ms) return RELATIVE_TIME.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

// Memoized so typing in the username input doesn't re-render every card.
const RepoCard = React.memo(function RepoCard({repo}: { repo: Repository }) {
  return (
    <ListItem disablePadding sx={{paddingY: 1}}>
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          transition: (theme) =>
            theme.transitions.create(["box-shadow", "border-color"], {
              duration: theme.transitions.duration.short,
            }),
          "&:hover": {
            boxShadow: 4,
            borderColor: "primary.main",
          },
        }}
      >
        <CardActionArea
          component="a"
          href={pagesUrl(repo)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <CardContent>
            <Typography variant="h6" component="h2">{repo.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
              {repo.description || "No description provided."}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{mt: 1, display: "block"}}
              suppressHydrationWarning
            >
              Updated {formatRelativeTime(repo.pushed_at)}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </ListItem>
  );
});

const RepoList = React.memo(function RepoList({repos}: { repos: Repository[] }) {
  return (
    <List>
      {repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo}/>
      ))}
    </List>
  );
});

export default function RepoExplorer({initialPage}: { initialPage: RepoPage | null }) {
  const [username, setUsername] = useState<string>(DEFAULT_USERNAME);
  const [repos, setRepos] = useState<Repository[]>(initialPage?.repos ?? []);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(initialPage?.hasMore ?? false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [revalidating, setRevalidating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Last username run() actually executed for; also distinguishes the very
  // first load (null) and lets StrictMode's dev remount keep existing state
  // instead of discarding the prerendered data.
  const lastRunNameRef = useRef<string | null>(null);
  const loadingMoreRef = useRef<boolean>(false);
  const revalidatingRef = useRef<boolean>(false);

  // Fetch page 1 for a session, replacing the current list. In background mode
  // (stale-while-revalidate) the current list stays visible and errors are ignored.
  const loadUser = useCallback(async (session: Session, background: boolean) => {
    const {name, controller} = session;
    if (controller.signal.aborted) return;

    if (background) {
      revalidatingRef.current = true;
      setRevalidating(true);
    } else {
      setLoading(true);
      setRepos([]);
      setHasMore(false);
    }
    setError(null);

    try {
      const result = await fetchRepoPage(name, 1, {signal: controller.signal});
      if (sessionRef.current !== session || controller.signal.aborted) return;
      setRepos(result.repos);
      setPage(1);
      setHasMore(result.hasMore);
      writeCache(name, {repos: result.repos, page: 1, hasMore: result.hasMore});
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      if (sessionRef.current !== session) return;
      if (!background) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
        setRepos([]);
        setHasMore(false);
      }
    } finally {
      if (background) {
        revalidatingRef.current = false;
        if (sessionRef.current === session) setRevalidating(false);
      } else if (sessionRef.current === session) {
        setLoading(false);
      }
    }
  }, []);

  // Debounced load on username change; each change starts a new session whose
  // controller cancels the previous session's in-flight requests.
  useEffect(() => {
    const name = username.trim();
    const session: Session = {name, controller: new AbortController()};
    sessionRef.current = session;

    const isFirstRun = lastRunNameRef.current === null;

    const run = () => {
      // Same name as the last executed run (StrictMode dev remount or a
      // type-and-undo within the debounce window): keep current state.
      if (lastRunNameRef.current === name) return;
      lastRunNameRef.current = name;

      loadingMoreRef.current = false;
      setLoadingMore(false);
      setLoadMoreError(null);

      if (!name) {
        setRepos([]);
        setHasMore(false);
        setError(null);
        setLoading(false);
        return;
      }

      if (!USERNAME_PATTERN.test(name)) {
        setError(`"${name}" is not a valid GitHub username.`);
        setRepos([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const cached = readCache(name);
      if (cached) {
        setRepos(cached.repos);
        setPage(cached.page);
        setHasMore(cached.hasMore);
        setError(null);
        setLoading(false);
        if (Date.now() - cached.ts > CACHE_TTL_MS) {
          void loadUser(session, true);
        }
        return;
      }

      // First mount with build-time data: show it instantly, refresh quietly.
      if (isFirstRun && initialPage && name === DEFAULT_USERNAME) {
        void loadUser(session, true);
        return;
      }

      void loadUser(session, false);
    };

    if (isFirstRun) {
      run();
      return () => session.controller.abort();
    }

    const timer = setTimeout(run, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      session.controller.abort();
    };
  }, [username, initialPage, loadUser]);

  const loadMore = useCallback(async () => {
    const session = sessionRef.current;
    const name = username.trim();
    // Only load more for the session this callback's state belongs to; a
    // session started for another username must never see this data.
    if (!session || session.name !== name || session.controller.signal.aborted) return;
    if (loadingMoreRef.current || revalidatingRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const nextPage = page + 1;
      const result = await fetchRepoPage(name, nextPage, {signal: session.controller.signal});
      if (sessionRef.current !== session || session.controller.signal.aborted) return;
      const merged = mergeRepos(repos, result.repos);
      setRepos(merged);
      setPage(nextPage);
      setHasMore(result.hasMore);
      writeCache(name, {repos: merged, page: nextPage, hasMore: result.hasMore});
    } catch (err) {
      if (isAbortError(err) || session.controller.signal.aborted) return;
      if (sessionRef.current !== session) return;
      setLoadMoreError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      loadingMoreRef.current = false;
      if (sessionRef.current === session) setLoadingMore(false);
    }
  }, [username, page, repos]);

  // Infinite scroll: load the next page when the sentinel nears the viewport.
  // Recreating the observer after each state change re-fires it if the sentinel
  // is still visible, so sparse pages keep loading until the viewport fills up.
  // Paused while a background revalidation is in flight so a stale-closure
  // merge can never clobber the fresh page-1 result.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading || loadingMore || revalidating || error || loadMoreError) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      {rootMargin: "400px"},
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, revalidating, error, loadMoreError, repos, loadMore]);

  const showEmptyState =
    !loading && !loadingMore && !error && !hasMore &&
    repos.length === 0 && username.trim().length > 0;

  return (
    <Container maxWidth="md">
      <Box sx={{my: 4}}>
        {/* Editable username with a terminal-style blinking cursor. While the
            input is focused the native caret takes over and the pipe hides. */}
        <Typography
          variant="h4"
          component="h1"
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "baseline",
            fontWeight: "bold",
            "&:focus-within .cursor-pipe": {animation: "none", opacity: 0},
          }}
        >
          <Box
            component="span"
            sx={{
              display: "inline-grid",
              maxWidth: "100%",
              overflow: "hidden",
              borderBottom: "2px solid transparent",
              "&:hover": {borderBottomColor: "action.disabled"},
              "&:focus-within": {borderBottomColor: "text.primary"},
            }}
          >
            {/* Hidden mirror sizes the grid cell to the text, so the cursor hugs the last character */}
            <Box
              component="span"
              aria-hidden
              sx={{gridArea: "1 / 1", visibility: "hidden", whiteSpace: "pre", minWidth: "1ch"}}
            >
              {username || "Enter GitHub username"}
            </Box>
            <InputBase
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              inputProps={{
                "aria-label": "GitHub Username",
                size: 1,
                spellCheck: false,
                autoCapitalize: "none",
                autoCorrect: "off",
                autoComplete: "off",
              }}
              placeholder="Enter GitHub username"
              sx={{
                gridArea: "1 / 1",
                font: "inherit",
                letterSpacing: "inherit",
                color: "inherit",
                width: "100%",
                "& .MuiInputBase-input": {width: "100%", minWidth: 0, p: 0},
              }}
            />
          </Box>
          <Box
            component="span"
            aria-hidden
            className="cursor-pipe"
            sx={{
              ml: "1px",
              userSelect: "none",
              animation: "cursor-blink 1s step-end infinite",
              "@keyframes cursor-blink": {"50%": {opacity: 0}},
              "@media (prefers-reduced-motion: reduce)": {animation: "none"},
            }}
          >
            |
          </Box>
        </Typography>

        {/* Subtitle */}
        <Typography variant="subtitle1" component="p" gutterBottom>
          Open source projects with GitHub Pages
        </Typography>

        {/* Show Error Message */}
        {error && (
          <Box sx={{my: 2}}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {/* Show Loading Spinner */}
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" height="20vh">
            <CircularProgress/>
          </Box>
        )}

        {/* Render List of Repositories, newest pushes first */}
        {!loading && repos.length > 0 && <RepoList repos={repos}/>}

        {/* Infinite scroll sentinel; rendered whenever more pages exist so
            pagination continues even when a whole page had no Pages repos */}
        {!loading && hasMore && !error && <Box ref={sentinelRef} sx={{height: "1px"}}/>}

        {loadingMore && (
          <Box display="flex" justifyContent="center" sx={{py: 2}}>
            <CircularProgress size={24}/>
          </Box>
        )}

        {/* Scroll-loading failed: show it where the user actually is, with a retry */}
        {loadMoreError && !loading && (
          <Box sx={{my: 2}}>
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={() => setLoadMoreError(null)}>
                  Retry
                </Button>
              }
            >
              {loadMoreError}
            </Alert>
          </Box>
        )}

        {/* Everything loaded: make "no more pagination" self-explanatory */}
        {!loading && !error && !hasMore && repos.length > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{display: "block", textAlign: "center", mt: 2}}
          >
            All {repos.length} GitHub Pages {repos.length === 1 ? "repository" : "repositories"} loaded
          </Typography>
        )}

        {/* No Repositories Found */}
        {showEmptyState && (
          <Typography variant="body1" color="text.secondary" sx={{textAlign: "center", mt: 4}}>
            No repositories with GitHub Pages found.
          </Typography>
        )}
      </Box>
    </Container>
  );
}
