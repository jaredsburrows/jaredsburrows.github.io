# Jared's GitHub Pages

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![website](https://github.com/jaredsburrows/jaredsburrows.github.io/actions/workflows/website.yml/badge.svg?branch=main)](https://github.com/jaredsburrows/jaredsburrows.github.io/actions/workflows/website.yml)
[![Twitter Follow](https://img.shields.io/twitter/follow/jaredsburrows.svg?style=social)](https://twitter.com/jaredsburrows)


## Run Locally
```shell
npm install && npm run dev
# then open http://localhost:3000
```

## Run Linter
```shell
npm run lint
```

## Build Website
```shell
npm run build
```

## Test the Production Build Locally
Serves the exact static output that GitHub Pages deploys:
```shell
npm run build && npm run serve
# then open http://localhost:4173
```

## Update Dependencies Manually

```shell
rm -f package-lock.json && \
npm update && \
npm outdated && \
npm audit fix --force && \
npm install
```
