"use client";

import React, {useEffect, useState} from "react";
import {
  Container,
  Typography,
  List,
  ListItem,
  CircularProgress,
  Box,
  Card,
  CardContent,
  Alert,
  Link,
} from "@mui/material";

interface Repository {
  name: string;
  html_url: string;
  description: string | null;
  has_pages: boolean;
}

const GITHUB_USERNAME = "jaredsburrows";
const GITHUB_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos`;

const Page: React.FC = () => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        let allRepos: Repository[] = [];
        let page = 1;

        while (true) {
          const response = await fetch(
            `${GITHUB_API_URL}?page=${page}&per_page=100`
          );

          if (!response.ok) {
            throw new Error(
              `Error fetching repositories: ${response.statusText}`
            );
          }

          const data: Repository[] = await response.json();

          if (data.length === 0) {
            break;
          }

          allRepos = allRepos.concat(data);
          page += 1;
        }

        const filteredRepos = allRepos.filter((repo) => repo.has_pages);
        setRepos(filteredRepos);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress/>
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Box sx={{my: 4}}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{my: 4}}>
        <Typography variant="h4" component="h1" sx={{mb: 2}}>
          Jared&#39;s GitHub Pages
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Explore Jared Burrows&#39; projects, tutorials, and web apps hosted on GitHub Pages.
        </Typography>
        <List>
          {repos.map((repo) => (
            <ListItem key={repo.name} disablePadding>
              <Link
                href={`https://${GITHUB_USERNAME}.github.io/${repo.name}`}
                target="_blank"
                rel="noopener"
                underline="none"
                sx={{width: "100%"}}
              >
                <Card
                  variant="outlined"
                  sx={{
                    width: "100%",
                    mb: 2,
                    ":hover": {boxShadow: 4},
                  }}
                >
                  <CardContent>
                    <Typography variant="h6">{repo.name}</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{mt: 1}}
                    >
                      {repo.description || "No description provided."}
                    </Typography>
                  </CardContent>
                </Card>
              </Link>
            </ListItem>
          ))}
        </List>
      </Box>
    </Container>
  );
};

export default Page;
