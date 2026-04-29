# Insighta Labs+ CLI

A command-line interface for the **Insighta Labs+ Profile Intelligence System**.

## Installation

```bash
npm install
npm run build
npm link          # makes `insighta` available globally
```

Or install directly:

```bash
npm install -g .
```

## Configuration

Copy `.env.example` to `.env` and set the backend URL:

```bash
cp .env.example .env
# Edit .env:
INSIGHTA_API_URL=https://your-backend-url.com
```

---

## Authentication

### Login with GitHub OAuth

```bash
insighta login
```

- Generates PKCE `code_verifier` + `code_challenge` locally
- Starts a temporary local callback server on port `9876`
- Opens GitHub OAuth in your browser
- On callback, exchanges the code with the backend using your `code_verifier`
- Saves tokens to `~/.insighta/credentials.json` (mode `600`)

### Login with Email/Password

```bash
insighta login-email -e user@example.com -p password
```

Authenticates using email and password credentials.

### Create Account

```bash
insighta signup -e user@example.com -p password -u username -r analyst
insighta signup -e user@example.com -p password -u username -r admin -n "Full Name"
```

Creates a new user account. Requires email, password, username, and role. Full name is optional.

### Logout

```bash
insighta logout
```

Revokes the refresh token server-side and clears local credentials.

### Refresh Tokens

```bash
insighta refresh
```

Manually refreshes access tokens. (Automatic refresh happens on 401 responses.)

### Whoami

```bash
insighta whoami
```

Displays the currently authenticated user's info.

---

## Profile Commands

### List profiles

```bash
insighta profiles list
insighta profiles list --gender male
insighta profiles list --country NG --age-group adult
insighta profiles list --min-age 25 --max-age 40
insighta profiles list --sort-by age --order desc
insighta profiles list --page 2 --limit 20
```

**Options:**

| Flag | Description |
|------|-------------|
| `--gender` | Filter by `male` or `female` |
| `--country` | Filter by ISO country code (e.g. `NG`, `KE`) |
| `--age-group` | Filter by `teenager`, `adult`, or `senior` |
| `--min-age` | Minimum age |
| `--max-age` | Maximum age |
| `--sort-by` | `age`, `created_at`, or `gender_probability` |
| `--order` | `asc` or `desc` |
| `--page` | Page number (default: 1) |
| `--limit` | Results per page, max 50 (default: 10) |

### Get a profile by ID

```bash
insighta profiles get <id>
```

### Search using natural language

```bash
insighta profiles search "young males from nigeria"
insighta profiles search "females above 30"
insighta profiles search "adult males from kenya"
```

### Create a profile (admin only)

```bash
insighta profiles create --name "Amara Nwosu"
```

Calls Genderize, Agify, and Nationalize APIs and stores the enriched profile.

### Export profiles to CSV

```bash
insighta profiles export --format csv
insighta profiles export --format csv --gender male --country NG
```

Saves the CSV to the current working directory as `profiles_<timestamp>.csv`.

---

## Token Handling

- **Access token**: short-lived (3 minutes)
- **Refresh token**: slightly longer-lived (5 minutes)
- **Auto-refresh**: on any `401` response, the CLI automatically attempts to refresh the access token using the stored refresh token
- **Manual refresh**: use `insighta refresh` to manually refresh tokens
- **Re-login prompt**: if refresh fails (token expired/revoked), credentials are cleared and the user is prompted to `insighta login` again

Credentials are stored at `~/.insighta/credentials.json` with permissions `600`.

---

## Role Enforcement

| Command | Required Role |
|---------|--------------|
| `profiles list` | `analyst` or `admin` |
| `profiles get` | `analyst` or `admin` |
| `profiles search` | `analyst` or `admin` |
| `profiles export` | `analyst` or `admin` |
| `profiles create` | `admin` only |
| `profiles delete` (API) | `admin` only |

The CLI passes the access token (which contains the role claim) on every request. The backend enforces RBAC — the CLI will surface a `403 Insufficient permissions` error if the user's role is insufficient.

---

## Architecture

```
insighta (CLI)
    │
    │  Bearer <access_token>
    │  X-API-Version: 1.0
    ▼
Backend API  (Express + TypeScript)
    │
    ├── /auth/*        (GitHub OAuth + PKCE, Email/Password Auth, JWT issuance)
    └── /api/profiles  (CRUD, search, export)
```

The CLI and web portal share the **same backend** — all data is consistent across interfaces.

---

## Development

```bash
npm run dev -- login                    # test GitHub OAuth
npm run dev -- login-email -e test@example.com -p pass  # test email login
npm run dev -- signup -e test@example.com -p pass -u testuser -r analyst  # test signup
npm run build                           # compile TypeScript
npm test                                # run tests
```
