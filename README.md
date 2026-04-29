# Insighta Labs+ CLI

A terminal client for the **Insighta Labs+ Profile Intelligence System**.

The CLI enables authentication, profile discovery, profile creation, and CSV export for user profiles managed by the Insighta backend.

## Features

- GitHub OAuth login with PKCE flow
- Email/password authentication
- User signup with role selection (`analyst` or `admin`)
- `whoami` user inspection
- Profile listing with filters and pagination
- Natural language profile search
- Profile retrieval by ID
- Profile creation (admin only)
- CSV export of profile data
- Automatic access token refresh on expired sessions
- Secure local credential storage at `~/.insighta/credentials.json`

## Requirements

- Node.js 18 or newer
- npm
- A running Insighta backend API

## Installation

```bash
npm install
npm run build
npm link
```

Or install globally from the repository root:

```bash
npm install -g .
```

## Configuration

The CLI reads the backend URL from the environment variable `INSIGHTA_API_URL`.

Create a `.env` file in the repo root:

```bash
cp .env.example .env
```

Then set:

```env
INSIGHTA_API_URL=https://hng-stage-1-production-7d03.up.railway.app
```

If not provided, the default backend URL is `https://hng-stage-1-production-7d03.up.railway.app`.

## Usage

### Authenticate

#### GitHub OAuth

```bash
insighta login
```

This opens GitHub in your browser and uses a local callback server on port `9876`.

#### Email and password

```bash
insighta login-email -e user@example.com -p password
```

#### Create a new account

```bash
insighta signup -e user@example.com -p password -u username -r analyst
insighta signup -e user@example.com -p password -u username -r admin -n "Full Name"
```

#### Logout

```bash
insighta logout
```

#### Refresh tokens

```bash
insighta refresh
```

#### Current user

```bash
insighta whoami
```

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

Options:

- `--gender <male|female>`
- `--country <ISO code>`
- `--age-group <teenager|adult|senior>`
- `--min-age <age>`
- `--max-age <age>`
- `--sort-by <age|created_at|gender_probability>`
- `--order <asc|desc>`
- `--page <n>`
- `--limit <n>`

### Get a profile by ID

```bash
insighta profiles get <id>
```

### Search profiles

```bash
insighta profiles search "young males from nigeria"
```

Use natural language queries to find matching profiles.

### Create a profile (admin only)

```bash
insighta profiles create --name "Amara Nwosu"
```

This sends a profile creation request to the backend, which enriches the profile data using external services.

### Export profiles to CSV

```bash
insighta profiles export --format csv
insighta profiles export --format csv --gender male --country NG
```

The export file is written to the current directory as `profiles_<timestamp>.csv`.

## Token Handling

- Access tokens are short-lived
- Refresh tokens are used to renew access automatically
- If a request returns `401`, the CLI attempts token refresh once
- If refresh fails, credentials are cleared and re-authentication is required

Credentials are stored securely in `~/.insighta/credentials.json` with mode `600`.

## Role-Based Access

| Command                    | Likely Role Required |
| -------------------------- | -------------------- |
| `insighta profiles list`   | `analyst` or `admin` |
| `insighta profiles get`    | `analyst` or `admin` |
| `insighta profiles search` | `analyst` or `admin` |
| `insighta profiles export` | `analyst` or `admin` |
| `insighta profiles create` | `admin` only         |

Role enforcement is handled by the backend API.

## Backend Integration

The CLI communicates with the configured backend API and sends the `X-API-Version: 1.0` header for profile routes.

## Development

Run the CLI directly from source:

```bash
npm install
npm run dev -- login
npm run dev -- login-email -e test@example.com -p pass
npm run dev -- signup -e test@example.com -p pass -u testuser -r analyst
```

Build and test:

```bash
npm run build
npm test
```
