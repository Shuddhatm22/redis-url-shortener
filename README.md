# Redis URL Shortener

A command-line URL shortener built with **TypeScript** and **Redis**. Built as a hands-on learning project to explore Redis data structures and TypeScript fundamentals.

## Tech Stack

- **TypeScript** — language
- **Node.js** — runtime
- **ioredis** — Redis client
- **ts-node** — run TypeScript directly without a compile step

## Prerequisites

- Node.js v18+
- Redis running locally

```bash
brew install redis
brew services start redis
```

## Setup

```bash
git clone https://github.com/Shuddhatm22/redis-url-shortener.git
cd redis-url-shortener
npm install
```

## Usage

```bash
# Shorten a URL
npm start -- shorten https://www.github.com

# Resolve a short code back to the original URL
npm start -- resolve <code>

# View visit count and expiry for a short code
npm start -- stats <code>

# View the last 10 shortened URLs
npm start -- history

# View top 5 most visited URLs
npm start -- leaderboard
```

## Features

| Feature | Description | Redis Concept |
|---|---|---|
| Shorten URL | Generates a unique 6-char code for any URL | `SET`, `EXPIRE` |
| Resolve URL | Returns original URL and tracks the visit | `GET`, `INCR` |
| Stats | Shows visit count and remaining TTL | `GET`, `TTL` |
| Duplicate detection | Returns existing code if URL was already shortened | `HSET`, `HGET` |
| History | Last 10 shortened URLs in reverse-chronological order | `LPUSH`, `LTRIM`, `LRANGE` |
| Leaderboard | Top 5 URLs ranked by visit count | `ZINCRBY`, `ZRANGE` |

## Redis Data Model

```
url:{code}       →  String     — the original long URL (expires in 7 days)
clicks:{code}    →  String     — visit counter (atomic INCR)
url-map          →  Hash       — maps long URLs to their short codes (dedup)
url-history      →  List       — last 10 shortened URLs (capped with LTRIM)
leaderboard      →  Sorted Set — short codes ranked by visit count
```

## Project Structure

```
redis-url-shortener/
├── src/
│   └── shortener.ts   — all logic lives here
├── package.json
└── tsconfig.json
```

## Redis Concepts Covered

- **Strings** — basic key-value storage with TTL
- **INCR** — atomic counters with no race conditions
- **Hashes** — object storage for duplicate detection
- **Lists** — ordered history with `LPUSH` + `LTRIM` capped list pattern
- **Sorted Sets** — score-based leaderboard with `ZINCRBY` and `ZRANGE`
- **Key namespacing** — `url:`, `clicks:` prefixes for organized key management
- **Persistence** — how Redis survives restarts via RDB snapshots
