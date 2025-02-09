"use client";

import React, {useEffect, useState, useCallback, useMemo} from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Container,
  InputBase,
  Link,
  List,
  ListItem,
  Typography,
} from "@mui/material";

interface Repository {
  name: string;
  html_url: string;
  description: string | null;
  has_pages: boolean;
}

const GITHUB_API_URL = "https://api.github.com/users";
const DEFAULT_USERNAME = "jaredsburrows";

export default function Home() {
  const [username, setUsername] = useState<string>(DEFAULT_USERNAME);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch repositories
  const fetchRepos = useCallback(async (username: string) => {
    if (!username.trim()) return;

    setLoading(true);
    setError(null);

    try {
      let allRepos: Repository[] = [];
      let page = 1;

      while (true) {
        const response = await fetch(`${GITHUB_API_URL}/${username}/repos?page=${page}&per_page=100`);

        if (!response.ok) {
          setError(`Error fetching repositories: ${response.statusText}`);
          return;
        }

        const data: Repository[] = await response.json();
        if (data.length === 0) break;

        allRepos = [...allRepos, ...data];
        page += 1;
      }

      setRepos(allRepos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRepos(username).catch((err) => console.error("Unhandled fetch error:", err));
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [username, fetchRepos]);

  // Filter repositories with GitHub Pages
  const githubPagesRepos = useMemo(() => repos.filter((repo) => repo.has_pages), [repos]);

  return (
    <Container maxWidth="md">
      <Box sx={{my: 4}}>
        {/* Editable Username Input */}
        <Typography variant="h4" component="h1" sx={{mb: 2, display: "flex", alignItems: "center"}}>
          <InputBase
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            inputProps={{"aria-label": "GitHub Username"}}
            placeholder="Enter Github username"
            sx={{
              fontSize: "inherit",
              fontWeight: "bold",
              width: "100%",
              borderBottom: "2px solid transparent",
              "&:hover": {borderBottom: "2px solid gray"},
              "&:focus": {borderBottom: "2px solid black"},
              outline: "none",
            }}
          />
        </Typography>

        {/* Subtitle */}
        <Typography variant="subtitle1" gutterBottom>
          Open source projects with GitHub Pages
        </Typography>

        {/* Show Loading Spinner */}
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" height="20vh">
            <CircularProgress/>
          </Box>
        )}

        {/* Show Error Message */}
        {error && (
          <Box sx={{my: 2}}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {/* Render List of Repositories */}
        {!loading && !error && githubPagesRepos.length > 0 && (
          <List>
            {githubPagesRepos.map((repo) => (
              <ListItem key={repo.name} disablePadding sx={{paddingY: 1}}>
                <Link
                  href={`https://${username}.github.io/${repo.name}`}
                  target="_blank"
                  rel="noopener"
                  underline="none"
                  sx={{width: "100%", display: "block"}}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      width: "100%",
                      ":hover": {boxShadow: 4},
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6">{repo.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                        {repo.description || "No description provided."}
                      </Typography>
                    </CardContent>
                  </Card>
                </Link>
              </ListItem>
            ))}
          </List>
        )}

        {/* No Repositories Found */}
        {!loading && !error && githubPagesRepos.length === 0 && (
          <Typography variant="body1" color="text.secondary" sx={{textAlign: "center", mt: 4}}>
            No repositories with GitHub Pages found.
          </Typography>
        )}
      </Box>
    </Container>
  );
}
