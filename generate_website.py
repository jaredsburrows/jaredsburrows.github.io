import os
from http import HTTPStatus

import requests

# GitHub username and API endpoint
GITHUB_USERNAME = 'jaredsburrows'
GITHUB_API_URL = f'https://api.github.com/users/{GITHUB_USERNAME}/repos'

# Ensure the 'site/' folder exists
os.makedirs('site', exist_ok=True)

# Fetch the list of repositories
response = requests.get(GITHUB_API_URL)
repos = response.json()

# Collect the list of repositories with active GitHub Pages
pages_list = []
for repo in repos:
  if repo.get('has_pages'):
    pages_url = f"https://{GITHUB_USERNAME}.github.io/{repo['name']}"
    check_response = requests.get(pages_url)
    if check_response.status_code == HTTPStatus.OK:
      description = repo.get('description', 'No description provided.')
      pages_list.append((repo['name'], pages_url, description))

# Generate the HTML content
html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jared's GitHub Pages</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        h1 { color: #333; }
        ul { list-style-type: none; padding: 0; }
        li { margin-bottom: 10px; }
        a { text-decoration: none; color: #0366d6; }
        a:hover { text-decoration: underline; }
        .description { margin-left: 15px; font-style: italic; color: #555; }
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
