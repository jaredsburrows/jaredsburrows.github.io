import os
from http import HTTPStatus
import requests

# GitHub username and API endpoint
GITHUB_USERNAME = 'jaredsburrows'
GITHUB_API_URL = f'https://api.github.com/users/{GITHUB_USERNAME}/repos'

# Ensure the 'site/' folder exists
os.makedirs('site', exist_ok=True)

# Collect all repositories with pagination handling
repos = []
page = 1
while True:
  response = requests.get(GITHUB_API_URL, params={'page': page, 'per_page': 100})
  data = response.json()
  if not data:
    break  # Exit the loop when no more repositories are returned
  repos.extend(data)
  page += 1

# Collect repositories with active GitHub Pages
pages_list = []
for repo in repos:
  if repo.get('has_pages'):
    pages_url = f"https://{GITHUB_USERNAME}.github.io/{repo['name']}"

    # Allow redirects and capture the final URL
    check_response = requests.get(pages_url, allow_redirects=True)

    if check_response.status_code == HTTPStatus.OK:
      final_url = check_response.url  # Capture the final redirected URL
      description = repo.get('description', 'No description provided.')
      pages_list.append((repo['name'], final_url, description))

# Generate the HTML content
html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="List of all Jared's GitHub Pages.">
    <meta name="keywords" content="jared burrows, github, pages">
    <meta name="google-site-verification" content="wXZjUJohTKlFAoqAe2LvvhcuM1bH49QmsE8kksjrtqE">
    <title>Jared's GitHub Pages</title>
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <link rel="canonical" href="https://jaredsburrows.github.io/">

    <!-- OpenGraph Meta - https://ogp.me/ -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Jared's GitHub Pages">
    <meta property="og:description" content="List of all Jared's GitHub Pages.">
    <meta property="og:site_name" content="Jared's GitHub Pages">
    <meta property="og:url" content="https://jaredsburrows.github.io/">
    <!-- End OpenGraph Meta - https://ogp.me/ -->

    <!-- Twitter Meta - https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:site" content="@jaredsburrows">
    <meta name="twitter:domain" content="jaredsburrows.github.io">
    <meta name="twitter:title" content="Jared's GitHub Pages">
    <meta name="twitter:description" content="List of all Jared's GitHub Pages.">
    <meta name="twitter:url" content="https://jaredsburrows.github.io/">
    <!-- End Twitter Meta - https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup -->

    <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          color: #333;
          padding: 20px;
        }
        h1 { color: #333; }
        ul { list-style-type: none; padding: 0; }
        li { margin-bottom: 10px; }
        a { text-decoration: none; color: #0366d6; }
        a:hover { text-decoration: underline; }
        .description { margin-left: 15px; font-style: italic; color: #555; }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1e1e1e;
            color: #f4f4f4;
          }
          h1 { color: #f4f4f4; }
          a { color: #58a6ff; }
          .description { color: #999; }
        }
    </style>
</head>
<body>
    <h1>Jared's GitHub Pages</h1>
    <ul>
"""

# Append each repository as a list item
for name, url, description in pages_list:
  html_content += f"""
        <li>
            <a href="{url}" target="_blank">{name}</a>
            <div class="description">{description}</div>
        </li>
    """

# Close the HTML content
html_content += """
    </ul>
</body>
</html>
"""

# Write the HTML content to 'site/index.html'
with open('site/index.html', 'w') as file:
  file.write(html_content)

print("GitHub Pages index.html generated in the 'site/' folder.")
