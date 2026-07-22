import RepoExplorer from "@/components/RepoExplorer";
import {DEFAULT_USERNAME, fetchRepoPage, type RepoPage} from "@/lib/github";

// With `output: "export"` this runs once at build time, so the deployed HTML
// ships with the repo list already rendered — no client API call needed on load.
export default async function Home() {
  let initialPage: RepoPage | null = null;
  try {
    initialPage = await fetchRepoPage(DEFAULT_USERNAME, 1, {
      token: process.env.GITHUB_TOKEN,
    });
  } catch {
    // Rate limit or network failure at build time: ship without prerendered
    // data and let the client fetch it on load instead.
  }

  return <RepoExplorer initialPage={initialPage}/>;
}
