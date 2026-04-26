markdown

# Insighta CLI

Command-line interface for Insighta Labs+ Profile Intelligence Platform.

## Installation

```bash
npm install -g insighta-cli
Configuration
Set the API URL (optional):

bash
export INSIGHTA_API_URL=https://your-backend-url.com
Usage
Authentication
bash
# Login with GitHub
insighta login

# Check current user
insighta whoami

# Logout
insighta logout
Profile Management
bash
# List profiles with filters
insighta profiles list
insighta profiles list --gender male --country NG
insighta profiles list --min-age 25 --max-age 40
insighta profiles list --sort-by age --order desc --page 2 --limit 20

# Get profile by ID
insighta profiles get <profile-id>

# Search with natural language
insighta profiles search "young males from nigeria"
insighta profiles search "females above 30"

# Create profile (admin only)
insighta profiles create --name "Harriet Tubman"

# Export to CSV
insighta profiles export --format csv
insighta profiles export --gender male --country NG

# Delete profile (admin only)
insighta profiles delete <profile-id>
Token Storage
Credentials are stored securely at ~/.insighta/credentials.json with 600 permissions.

Features
✅ GitHub OAuth with PKCE

✅ Automatic token refresh

✅ Rich table output

✅ Loading spinners

✅ Natural language search

✅ CSV export

✅ Role-based access control

text

## Summary

Now we have:

1. **Rate limiting & logging** - In-memory rate limiter with file-based logs
2. **Refactored profile routes** - With auth middleware, CSV export, and updated pagination with links
3. **CLI tool** - Full-featured CLI with token storage, auto-refresh, and rich output

The system now has:
- ✅ GitHub OAuth with PKCE
- ✅ Role-based access (admin/analyst)
- ✅ Token management (3 min access, 5 min refresh)
- ✅ API versioning
- ✅ Rate limiting (10/min auth, 60/min other)
- ✅ Request logging
- ✅ CSV export
- ✅ Updated pagination with metadata
- ✅ CLI with auto token refresh
```
