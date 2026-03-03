# StudyCAT Shibboleth SSO

**Status**: Complete

This directory contains a Shibboleth Single Sign-On (SSO) implementation for local development and testing.

## Components

- **OpenLDAP**: User directory with test accounts
- **Identity Provider (IdP)**: Issues SAML assertions
- **Service Provider (SP)**: Validates assertions and proxies to Next.js

## Architecture

```
Browser
   │
   ↓ HTTPS (443)
┌─────────────────────────┐
│  Service Provider (SP)  │
│  Apache + mod_shib      │
│  sp.studycat.local      │
└───────────┬─────────────┘
            │
   ┌────────┴────────┐
   ↓                 ↓
┌──────────┐    ┌──────────────────┐
│ Next.js  │    │ Identity Provider│
│ App      │    │ (IdP)            │
│ :3000    │    │ idp.studycat.local│
└──────────┘    │ :4443            │
                └────────┬─────────┘
                         ↓
                   ┌──────────┐
                   │ OpenLDAP │
                   │ :389     │
                   └──────────┘
```

## Quick Start

### Prerequisites

1. Docker and Docker Compose installed
2. Add to `/etc/hosts`:
   ```
   127.0.0.1 idp.studycat.local sp.studycat.local
   ```

3. Build Docker images:
   ```bash
   cd shibboleth/idp && docker build -t studycat-idp:latest .
   cd ../sp && docker build -t studycat-sp:latest .
   ```

### Start Services

```bash
docker compose --profile shibboleth up -d
```

### Test SSO

1. Visit: `https://sp.studycat.local/Shibboleth.sso/Login`
2. Accept SSL warnings (self-signed certificates)
3. Login: `student` / `password123`
4. Check session: `https://sp.studycat.local/Shibboleth.sso/Session`

## Test Users

All passwords: `password123`

| Username | Affiliations |
|----------|--------------|
| `student` | member, student |
| `instructor` | member, faculty, staff |
| `admin` | member, staff, employee |

## HTTP Headers

The SP passes these headers to the Next.js application:

| Header | Source Attribute |
|--------|------------------|
| `X-Remote-User` | REMOTE_USER |
| `X-Remote-Eppn` | eduPersonPrincipalName |
| `X-Remote-Uid` | uid |
| `X-Remote-Mail` | mail |
| `X-Remote-DisplayName` | displayName |
| `X-Remote-Affiliation` | eduPersonAffiliation |
| `X-Remote-Scoped-Affiliation` | eduPersonScopedAffiliation |

The application uses `uid` (or `remote_user`/`eppn` as fallback) to identify the user.

## Configuration

### Identity Provider

| Setting | Value |
|---------|-------|
| Entity ID | `https://idp.studycat.local/idp/shibboleth` |
| Port | 4443 (browser), 8443 (backchannel) |
| Config | `shibboleth/idp/customized-shibboleth-idp/conf/` |

### Service Provider

| Setting | Value |
|---------|-------|
| Entity ID | `https://sp.studycat.local/shibboleth` |
| Ports | 80 (redirect), 443 (HTTPS) |
| Config | `shibboleth/sp/config/` |
| Session Lifetime | 8 hours |

### Protected Routes

Routes requiring authentication (configured in `sp/config/apache-studycat.conf`):
- `/quizzes`
- `/question-bank`
- `/students`
- `/analytics`
- `/upload`
- `/quiz`
- `/api/auth/shibboleth/callback`

## Directory Structure

```
shibboleth/
├── README.md
├── DOCUMENTATION-SUMMARY.md
├── idp/
│   ├── Dockerfile
│   ├── README.md
│   ├── credentials/
│   └── customized-shibboleth-idp/
│       ├── conf/
│       ├── metadata/
│       ├── views/
│       └── webapp/
├── sp/
│   ├── Dockerfile
│   ├── certificates/
│   └── config/
│       ├── apache-studycat.conf
│       ├── attribute-map.xml
│       ├── attribute-policy.xml
│       ├── idp-metadata.xml
│       ├── protected-routes.conf
│       ├── shibboleth-headers.conf
│       └── shibboleth2.xml
└── ldap/
    ├── 01_eduPerson.ldif
    └── 02_bootstrap.ldif
```

## Commands

```bash
# Start services
docker compose --profile shibboleth up -d

# Stop services
docker compose --profile shibboleth down

# View logs
docker logs studycat_idp
docker logs studycat_sp

# Rebuild images
cd shibboleth/idp && docker build -t studycat-idp:latest .
cd shibboleth/sp && docker build -t studycat-sp:latest .
docker compose --profile shibboleth up -d --force-recreate
```

## Troubleshooting

### Services Not Starting

```bash
docker compose ps
docker logs studycat_idp
docker logs studycat_sp
```

Common issues:
- Port conflicts (80, 443, 4443, 8443)
- Missing `/etc/hosts` entries

### Can't Access in Browser

```bash
# Verify DNS
grep studycat /etc/hosts

# Test connectivity
curl -k https://idp.studycat.local:4443/idp/shibboleth
curl -k https://sp.studycat.local/Shibboleth.sso/Metadata
```

### SSL Certificate Warnings

Expected behavior - self-signed certificates for development.

### 503 After Login

This means authentication succeeded but Next.js is not running:
```bash
# Start Next.js
pnpm dev

# Then visit https://sp.studycat.local/
```

### Expired Metadata

```bash
# Download fresh IdP metadata
curl -k https://idp.studycat.local:4443/idp/shibboleth > shibboleth/sp/config/idp-metadata.xml

# Rebuild SP
cd shibboleth/sp && docker build -t studycat-sp:latest .
docker compose --profile shibboleth up -d --force-recreate sp
```

## Credentials

| Credential | Password |
|------------|----------|
| IdP Keystore | `abc123` |
| LDAP Admin | `admin123` |
| Test Users | `password123` |

## URLs

| URL | Purpose |
|-----|---------|
| `https://sp.studycat.local/` | StudyCAT via SSO |
| `https://sp.studycat.local/Shibboleth.sso/Login` | Initiate login |
| `https://sp.studycat.local/Shibboleth.sso/Logout` | Logout |
| `https://sp.studycat.local/Shibboleth.sso/Session` | View session |
| `https://sp.studycat.local/Shibboleth.sso/Metadata` | SP metadata |
| `https://idp.studycat.local:4443/idp/shibboleth` | IdP metadata |
| `http://localhost:3000` | Direct access (no SSO) |

## Security Notice

This setup is for **development only**:
- Self-signed certificates
- Simple passwords
- No encryption on SAML assertions
- All attributes released

For production, integrate with UofT's real Shibboleth IdP.
