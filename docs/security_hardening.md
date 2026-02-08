# Security Hardening Knobs

This document summarizes the runtime knobs for Slotta's security middleware.

## Environment Variables

```
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=120
BRUTE_FORCE_WINDOW_SECONDS=300
BRUTE_FORCE_MAX_ATTEMPTS=6
APP_ENV=development|staging|production
FRONTEND_URL=https://your-frontend-domain
CORS_ORIGINS=https://your-frontend-domain
```

## Notes

- Rate limiting applies globally by IP address.
- Brute-force protection applies to login attempts by IP + email.
- In production, HTTPS redirect is enabled.
- Secure headers are always applied (Helmet-style).
