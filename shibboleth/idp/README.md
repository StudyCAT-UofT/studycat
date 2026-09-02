# Catalyze Shibboleth Identity Provider (IdP)

This directory contains the configuration for a mock Shibboleth Identity Provider used for local development and testing.

## Overview

The IdP authenticates users against OpenLDAP and issues SAML assertions to the Service Provider (SP). It provides user attributes that the SP forwards to the Catalyze application.

```
User Browser
     │
     ↓
Service Provider (SP)  ◄──SAML──►  Identity Provider (IdP)
     │                                      │
     ↓                                      ↓
Catalyze App                           OpenLDAP
(port 3000)                            (port 389)
```

## Directory Structure

```
idp/
├── Dockerfile
├── README.md
├── credentials/
│   ├── README.md              # Security warning
│   ├── idp-browser.p12        # Browser TLS certificate (port 4443)
│   └── idp-backchannel.p12    # Backchannel TLS certificate (port 8443)
└── customized-shibboleth-idp/
    ├── conf/
    │   ├── idp.properties
    │   ├── ldap.properties
    │   ├── attribute-resolver.xml
    │   ├── attribute-filter.xml
    │   ├── relying-party.xml
    │   ├── metadata-providers.xml
    │   └── authn/
    │       └── password-authn-config.xml
    ├── credentials/
    ├── metadata/
    │   ├── idp-metadata.xml
    │   └── sp-metadata.xml
    ├── views/
    └── webapp/
```

## Test Users

All users have password: `password123`

| Username | Affiliations | Description |
|----------|--------------|-------------|
| `student` | member, student | Test student account |
| `instructor` | member, faculty, staff | Test instructor account |
| `admin` | member, staff, employee | Test admin account |

## Attributes Released

The IdP releases these SAML attributes to the SP:

| Attribute | Example Value | Description |
|-----------|---------------|-------------|
| `eduPersonPrincipalName` | `student@studycat.local` | Primary identifier |
| `uid` | `student` | Username |
| `mail` | `student@studycat.local` | Email address |
| `displayName` | `student` | Display name |
| `eduPersonAffiliation` | `member`, `student` | Role affiliations |
| `eduPersonScopedAffiliation` | `student@studycat.local` | Scoped affiliations |

The SP converts these to HTTP headers (`X-Remote-Uid`, `X-Remote-Eppn`, etc.) and forwards them to the Next.js application.

## Configuration

| Setting | Value |
|---------|-------|
| Entity ID | `https://idp.studycat.local/idp/shibboleth` |
| Scope | `studycat.local` |
| Browser TLS Port | 4443 |
| Backchannel Port | 8443 |

## Credentials

| Credential | Password |
|------------|----------|
| IdP Keystore (browser/backchannel) | `abc123` |
| OpenLDAP Admin | `admin123` |
| Test Users | `password123` |

## Building and Running

### Build the Image

```bash
cd shibboleth/idp
docker build -t studycat-idp:latest .
```

### Run with Docker Compose (Recommended)

```bash
# From project root
docker compose --profile shibboleth up -d
```

### Run Standalone

```bash
docker run -d \
  --name studycat-idp \
  -p 4443:4443 \
  -p 8443:8443 \
  -e JETTY_BROWSER_SSL_KEYSTORE_PASSWORD=abc123 \
  -e JETTY_BACKCHANNEL_SSL_KEYSTORE_PASSWORD=abc123 \
  studycat-idp:latest
```

### Verify

```bash
# Check container status
docker ps | grep studycat-idp

# View logs
docker logs -f studycat_idp

# Test metadata endpoint
curl -k https://idp.studycat.local:4443/idp/shibboleth
```

## Troubleshooting

### Container Won't Start

Check logs for errors:
```bash
docker logs studycat_idp
```

Common issues:
- Certificate password mismatch (should be `abc123`)
- Port already in use (`lsof -i :4443`)

### 503 Error

Wait 10-15 seconds after container start for initialization, then check logs.

### Platform Warning (ARM64)

Expected on M1/M2 Macs - Docker emulation works fine.

## Security Notice

This IdP is for **development only**:
- Uses simple passwords
- Self-signed certificates
- Releases all attributes to any SP
- No security hardening

For production, use UofT's real Shibboleth IdP.
