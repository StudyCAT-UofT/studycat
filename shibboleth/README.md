# StudyCAT Shibboleth SSO - Complete Setup Guide

**Status**: ✅ **WORKING** - Authentication infrastructure fully operational  
**Last Updated**: January 27, 2026

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)
7. [Next Steps](#next-steps)

---

## Overview

This directory contains a complete Shibboleth Single Sign-On (SSO) implementation for StudyCAT, consisting of:

- **OpenLDAP**: User directory service for authentication
- **Identity Provider (IdP)**: Mock Shibboleth IdP for development/testing
- **Service Provider (SP)**: Shibboleth SP with Apache reverse proxy
- **Docker Compose**: Orchestration for all services

### Current Status

✅ **Infrastructure Complete**:
- IdP running and issuing SAML assertions
- SP running and validating assertions
- Metadata exchange complete
- Session management working
- Attributes being released

✅ **SSO Flow Working**:
- Browser → SP → IdP authentication
- SAML assertion generation
- Session creation with attributes
- Ready to pass attributes to Next.js app

⏳ **Pending**:
- Next.js application integration (reading Shibboleth headers)

---

## Architecture

```
┌─────────────┐         HTTPS (443)         ┌──────────────────┐
│   Browser   │ ──────────────────────────> │  Service Provider│
│             │                              │    (Apache +     │
└─────────────┘                              │    mod_shib)     │
      │                                     └──────────────────┘
      │ Redirect (no session)                       │
      │                                             │
      ↓                                             │
┌─────────────────────────┐                         │
│   Identity Provider     │ <───────────────────────┘
│  (Shibboleth IdP)       │    SAML AuthnRequest
│  idp.studycat.local     │
└─────────────────────────┘
      │                │
      │ Show login     │ LDAP bind/search
      │ form           ↓
      │          ┌──────────────┐
      │          │   OpenLDAP   │
      │          │  (port 389)  │
      │          │              │
      ↓          │  Test users: │
┌─────────────┐ │  - student   │
│   Browser   │ │  - instructor│
│  enters     │ │  - admin     │
│  username/  │ └──────────────┘
│  password   │
└─────────────┘
      │
      │ SAML Response (assertion)
      ↓
┌─────────────┐
│   Browser   │ ─────> SP validates ─────> Create session
└─────────────┘        assertion            Extract attributes
                                                  │
                                                  ↓
                                           ┌──────────────┐
                                           │   Next.js    │
                                           │   App        │
                                           │ (localhost:  │
                                           │  3000)       │
                                           └──────────────┘
                                           Receives headers:
                                           X-Remote-User
                                           X-Remote-Mail
                                           X-Remote-Affiliation
```

---

## Quick Start

### Prerequisites

1. **Docker and Docker Compose** installed
2. **`/etc/hosts` configured**:
   ```bash
   sudo sh -c 'echo "127.0.0.1 idp.studycat.local sp.studycat.local" >> /etc/hosts'
   ```

3. **Docker images built**:
   ```bash
   # Build IdP
   cd shibboleth/idp
   docker build -t studycat-idp:latest .
   
   # Build SP
   cd ../sp
   docker build -t studycat-sp:latest .
   ```

### Starting Services

```bash
# From project root
cd "/Users/paartharya/Paarth Stuff/Courses/CSC494/Code/studycat"

# Start Shibboleth services
docker compose --profile shibboleth up -d

# Verify services are running
docker compose ps

# Check logs
docker compose logs -f idp
docker compose logs -f sp
```

You should see:
```
NAME            IMAGE                   STATUS
studycat_ldap   osixia/openldap:1.5.0   Up
studycat_idp    studycat-idp:latest     Up
studycat_sp     studycat-sp:latest      Up
```

### Testing the SSO Flow

1. **Open browser** (use incognito/private mode)

2. **Visit**: `https://sp.studycat.local/Shibboleth.sso/Login`

3. **Accept SSL warnings** (self-signed certificates)

4. **Enter login credentials**:
   - Username: `student`, `instructor`, or `admin`
   - Password: `password123`
   - Submit the login form
   - Redirected back to SP

5. **Check your session**: `https://sp.studycat.local/Shibboleth.sso/Session`

Expected session output:
```xml
<Session>
  <Applications>
    <Application id="default" entityID="https://sp.studycat.local/shibboleth">
      <Attributes>
        <Attribute name="eppn">
          <Value>student@studycat.local</Value>
        </Attribute>
        <Attribute name="affiliation">
          <Value>member</Value>
          <Value>student</Value>
        </Attribute>
        <!-- Additional attributes -->
      </Attributes>
    </Application>
  </Applications>
</Session>
```

---

## Configuration

### Identity Provider (IdP)

**Location**: `shibboleth/idp/`

**Key Files**:
- `Dockerfile` - IdP Docker image definition
- `customized-shibboleth-idp/conf/idp.properties` - Main configuration
- `customized-shibboleth-idp/conf/attribute-resolver.xml` - Attribute definitions (LDAP-backed)
- `customized-shibboleth-idp/conf/attribute-filter.xml` - Attribute release policy
- `customized-shibboleth-idp/conf/relying-party.xml` - SP trust configuration
- `customized-shibboleth-idp/conf/authn/password-authn-config.xml` - Password authentication (LDAP)
- `customized-shibboleth-idp/conf/ldap.properties` - LDAP connection settings

**Configuration Details**:
```yaml
Entity ID: https://idp.studycat.local/idp/shibboleth
Scope: studycat.local
Ports:
  - 4443: Browser TLS (HTTPS)
  - 8443: Backchannel TLS
Authentication: Password (LDAP-backed)
User Directory: OpenLDAP (port 389)
Encryption: Disabled (for testing)
```

**Test Users** (all with password `password123`):

| Username | Password | Affiliations | Role Mapping |
|----------|----------|--------------|--------------|
| `student` | `password123` | member, student | Student |
| `instructor` | `password123` | member, faculty, staff | Instructor |
| `admin` | `password123` | member, staff, employee | Admin |

**Attributes Released** (example for `student`):
- `eduPersonPrincipalName` (eppn): `student@studycat.local`
- `uid`: `student`
- `mail`: `student@studycat.local`
- `displayName`: Test Student
- `eduPersonAffiliation`: `member`, `student`
- `eduPersonScopedAffiliation`: `member@studycat.local`, `student@studycat.local`

### Service Provider (SP)

**Location**: `shibboleth/sp/`

**Key Files**:
- `Dockerfile` - SP Docker image definition
- `config/shibboleth2.xml` - Main SP configuration
- `config/attribute-map.xml` - SAML attribute → HTTP header mapping
- `config/apache-studycat.conf` - Apache reverse proxy config
- `config/idp-metadata.xml` - IdP metadata (trust)

**Configuration Details**:
```yaml
Entity ID: https://sp.studycat.local/shibboleth
Ports:
  - 80: HTTP (redirects to 443)
  - 443: HTTPS (main access)
Backend: http://host.docker.internal:3000 (Next.js app)
Session Lifetime: 8 hours
Protected Paths:
  - /quizzes
  - /question-bank
  - /students
  - /analytics
  - /upload
  - /quiz
```

**HTTP Headers Passed to Next.js**:
```
X-Remote-User: student
X-Remote-Eppn: student@studycat.local
X-Remote-Uid: student
X-Remote-Mail: student@studycat.local
X-Remote-DisplayName: student
X-Remote-Affiliation: member;student
```

### Docker Compose Configuration

**File**: `docker-compose.yml` (project root)

**Shibboleth Profile**:
```yaml
services:
  ldap:
    image: osixia/openldap:1.5.0
    container_name: studycat_ldap
    ports:
      - "389:389"
      - "636:636"
    environment:
      LDAP_ORGANISATION: "StudyCAT"
      LDAP_DOMAIN: "studycat.local"
      LDAP_ADMIN_PASSWORD: "admin123"
      LDAP_TLS: "false"
    profiles: ["shibboleth"]
    volumes:
      - ldap_data:/var/lib/ldap
      - ldap_config:/etc/ldap/slapd.d

  idp:
    image: studycat-idp:latest
    container_name: studycat_idp
    ports:
      - "4443:4443"
      - "8443:8443"
    environment:
      JETTY_BROWSER_SSL_KEYSTORE_PASSWORD: abc123
      JETTY_BACKCHANNEL_SSL_KEYSTORE_PASSWORD: abc123
    profiles: ["shibboleth"]
    depends_on:
      - ldap

  sp:
    image: studycat-sp:latest
    container_name: studycat_sp
    ports:
      - "80:80"
      - "443:443"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      HOSTNAME: sp.studycat.local
      SERVICE_TO_PROTECT: host.docker.internal
      SERVICE_PORT: "3000"
    profiles: ["shibboleth"]
    depends_on:
      - idp
    volumes:
      - ./shibboleth/sp/config/idp-metadata.xml:/etc/shibboleth/metadata/idp-metadata.xml:ro

volumes:
  ldap_data:
  ldap_config:
```

---

## Testing

### 1. Verify Services Are Running

```bash
# Check containers
docker compose ps

# Check IdP logs
docker logs studycat_idp --tail 50

# Check SP logs  
docker logs studycat_sp --tail 50
```

### 2. Test Metadata Endpoints

```bash
# IdP metadata
curl -k https://idp.studycat.local:4443/idp/shibboleth | head -20

# SP metadata
curl -k https://sp.studycat.local/Shibboleth.sso/Metadata | head -20
```

### 3. Test SSO Redirect

```bash
# Should return 302 redirect to IdP
curl -k -I https://sp.studycat.local/
```

Expected:
```
HTTP/1.1 302 Found
Location: https://idp.studycat.local:4443/idp/profile/SAML2/Redirect/SSO?SAMLRequest=...
```

### 4. Browser Testing

**Test Flow**:
1. Visit: `https://sp.studycat.local/Shibboleth.sso/Login`
2. Accept SSL warnings (twice - SP and IdP)
3. Enter login credentials (e.g., username: `student`, password: `password123`)
4. After successful authentication, check session: `https://sp.studycat.local/Shibboleth.sso/Session`

**Success Indicators**:
- ✅ Session XML shows attributes
- ✅ `eppn` attribute present
- ✅ `affiliation` attribute present
- ✅ No errors in logs

---

## Troubleshooting

### Services Not Starting

**Check logs**:
```bash
docker logs studycat_idp
docker logs studycat_sp
```

**Common issues**:
- Port conflicts (4443, 8443, 80, 443 already in use)
- Certificate password mismatch (should be `abc123`)
- Missing `/etc/hosts` entries

### Can't Access Services in Browser

**Verify DNS**:
```bash
grep studycat /etc/hosts
# Should show: 127.0.0.1 idp.studycat.local sp.studycat.local
```

**Test connectivity**:
```bash
ping idp.studycat.local
ping sp.studycat.local
```

### SSL Certificate Warnings

**Expected behavior**: Self-signed certificates will show warnings

**Solution**: Accept the risk and continue (for development only)

### No Session After Login

**Check SP logs**:
```bash
docker logs studycat_sp | grep -i error
```

**Common causes**:
- IdP metadata expired (check `validUntil` date in `sp/config/idp-metadata.xml`)
- Metadata not loaded by SP
- Clock skew between containers

**Fix expired metadata**:
```bash
# Download fresh metadata
curl -k https://idp.studycat.local:4443/idp/shibboleth > shibboleth/sp/config/idp-metadata.xml

# Update validUntil date to 1 year from now
# Rebuild SP
cd shibboleth/sp
docker build -t studycat-sp:latest .

# Restart
cd ../..
docker compose --profile shibboleth up -d --force-recreate sp
```

### 503 Service Unavailable After Login

**This is expected!** It means:
- ✅ Shibboleth authentication **succeeded**
- ❌ Next.js app is not running on `localhost:3000`

**Verify authentication worked**:
```bash
# Check session - if you see attributes, authentication succeeded
curl -k https://sp.studycat.local/Shibboleth.sso/Session
```

**Solution**: Start the Next.js application
```bash
cd "/Users/paartharya/Paarth Stuff/Courses/CSC494/Code/studycat"
npm run dev
```

Then visit: `https://sp.studycat.local/`

---

## Next Steps

### For Application Integration (Person 2)

Now that Shibboleth SSO is working, integrate with the Next.js application:

#### 1. Read Shibboleth Headers

Create `app/api/auth/shibboleth/callback/route.ts`:
```typescript
export async function GET(request: Request) {
  // Read headers set by Shibboleth SP
  const eppn = request.headers.get('x-remote-eppn');
  const mail = request.headers.get('x-remote-mail');
  const affiliation = request.headers.get('x-remote-affiliation');
  
  // Extract username from eppn (student@studycat.local → student)
  const username = eppn?.split('@')[0];
  
  // TODO: Find or create user in database
  // TODO: Map affiliation to StudyCAT role
  // TODO: Generate JWT token
  // TODO: Set session cookie
  // TODO: Redirect to dashboard
}
```

#### 2. Create Auth Mode Detection

Create `app/api/auth/mode/route.ts`:
```typescript
export async function GET() {
  return Response.json({
    mode: process.env.AUTH_MODE || 'simple',
    shibbolethUrl: process.env.SHIBBOLETH_SP_URL || 'https://sp.studycat.local'
  });
}
```

#### 3. Update Environment Variables

Add to `.env`:
```bash
AUTH_MODE=shibboleth
SHIBBOLETH_SP_URL=https://sp.studycat.local
```

#### 4. Update Login Page

Modify `app/login/page.tsx`:
```typescript
// Detect auth mode and redirect to Shibboleth if enabled
useEffect(() => {
  fetch('/api/auth/mode')
    .then(res => res.json())
    .then(data => {
      if (data.mode === 'shibboleth') {
        // Redirect to Shibboleth SP
        window.location.href = `${data.shibbolethUrl}/Shibboleth.sso/Login`;
      }
    });
}, []);
```

#### 5. Test End-to-End

1. Start Next.js: `npm run dev`
2. Visit: `https://sp.studycat.local/`
3. Verify authentication works
4. Check headers are received
5. Verify session is created

---

## Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **IdP Metadata** | https://idp.studycat.local:4443/idp/shibboleth | IdP SAML configuration |
| **SP Metadata** | https://sp.studycat.local/Shibboleth.sso/Metadata | SP SAML configuration |
| **SP Login** | https://sp.studycat.local/Shibboleth.sso/Login | Initiate SSO login |
| **SP Session** | https://sp.studycat.local/Shibboleth.sso/Session | View current session |
| **SP Logout** | https://sp.studycat.local/Shibboleth.sso/Logout | Terminate session |
| **StudyCAT (via SP)** | https://sp.studycat.local/ | Main app access |
| **StudyCAT (direct)** | http://localhost:3000 | Direct access (no SSO) |

---

## Configuration Reference

### Ports

| Port | Service | Purpose |
|------|---------|---------|
| 389 | OpenLDAP | LDAP directory (user authentication) |
| 636 | OpenLDAP | LDAPS (TLS, not used) |
| 80 | SP | HTTP (redirects to 443) |
| 443 | SP | HTTPS (main access point) |
| 4443 | IdP | Browser TLS |
| 8443 | IdP | Backchannel TLS |
| 3000 | Next.js | StudyCAT application |
| 5432 | PostgreSQL | Database |

### Credentials

**IdP TLS Keystore Passwords**: `abc123`
- Browser TLS keystore
- Backchannel TLS keystore

**OpenLDAP Admin Password**: `admin123`

**Test User Passwords**: All users have password `password123`
- `student` → Student role
- `instructor` → Instructor role  
- `admin` → Admin role

### Entity IDs

- **IdP**: `https://idp.studycat.local/idp/shibboleth`
- **SP**: `https://sp.studycat.local/shibboleth`

---

## Development vs Production

### Current Setup (Development/Testing)

- ✅ Password authentication with OpenLDAP
- ✅ Test users (student, instructor, admin)
- ✅ Self-signed certificates
- ✅ Unencrypted SAML assertions
- ✅ All attributes released to any SP
- ✅ Simple passwords (`password123`)
- ✅ Local DNS (via `/etc/hosts`)

### Future Production Setup

When connecting to UofT's real UTORid system:

- ⏳ Use UofT's Shibboleth IdP
- ⏳ Proper SSL certificates (Let's Encrypt or commercial)
- ⏳ SAML assertion encryption
- ⏳ Attribute release policies
- ⏳ Real user attributes from LDAP
- ⏳ Real DNS entries
- ⏳ Proper role mapping (faculty, staff, student)

---

## Directory Structure

```
shibboleth/
├── README.md                          # This file
├── idp/                               # Identity Provider
│   ├── Dockerfile                     # IdP Docker image
│   ├── customized-shibboleth-idp/     # IdP configuration
│   │   ├── conf/                      # Main configuration files
│   │   │   ├── idp.properties
│   │   │   ├── attribute-resolver.xml
│   │   │   ├── attribute-filter.xml
│   │   │   ├── relying-party.xml
│   │   │   ├── metadata-providers.xml
│   │   │   ├── ldap.properties            # LDAP connection config
│   │   │   └── authn/
│   │   │       └── password-authn-config.xml  # LDAP authentication
│   │   ├── credentials/               # Certificates and keys
│   │   ├── metadata/                  # SAML metadata
│   │   │   ├── idp-metadata.xml
│   │   │   └── sp-metadata.xml
│   │   ├── views/                     # UI templates
│   │   └── webapp/                    # Web resources
│   ├── README.md
│   └── TASK*.md                       # Documentation
│
├── sp/                                # Service Provider
│   ├── Dockerfile                     # SP Docker image
│   ├── certificates/                  # SSL/TLS certificates
│   ├── config/                        # SP configuration
│   │   ├── shibboleth2.xml           # Main SP config
│   │   ├── attribute-map.xml         # Attribute mapping
│   │   ├── apache-studycat.conf      # Apache config
│   │   └── idp-metadata.xml          # IdP metadata (trust)
│   ├── start.sh                       # Startup script
│   └── TASK*.md                       # Documentation
│
└── [legacy docs - can be archived]
    ├── BROWSER-TEST-GUIDE.md
    ├── QUICK-START.md
    ├── SETUP-PROGRESS.md
    └── TEST-RESULTS.md
```

---

## Commands Reference

### Start Services
```bash
docker compose --profile shibboleth up -d
```

### Stop Services
```bash
docker compose --profile shibboleth down
```

### Restart Services
```bash
docker compose --profile shibboleth restart
```

### Rebuild Images
```bash
# IdP
cd shibboleth/idp && docker build -t studycat-idp:latest .

# SP
cd shibboleth/sp && docker build -t studycat-sp:latest .

# Restart after rebuild
cd ../.. && docker compose --profile shibboleth up -d --force-recreate
```

### View Logs
```bash
# Follow logs
docker compose logs -f idp
docker compose logs -f sp

# Last 50 lines
docker logs studycat_idp --tail 50
docker logs studycat_sp --tail 50
```

### Check Status
```bash
# Container status
docker compose ps

# Service health
curl -k -I https://idp.studycat.local:4443/idp/shibboleth
curl -k -I https://sp.studycat.local/Shibboleth.sso/Metadata
```

---

## Support & Documentation

### Additional Documentation

- **IdP Setup**: `shibboleth/idp/README.md`
- **SP Task Summary**: `shibboleth/sp/TASK4-SUMMARY.md`

### Getting Help

1. Check this README's [Troubleshooting](#troubleshooting) section
2. Review container logs: `docker logs studycat_idp` and `docker logs studycat_sp`
3. Verify `/etc/hosts` configuration
4. Ensure all ports are available
5. Check Docker images are built: `docker images | grep studycat`

---

## Summary

**✅ What's Working**:
- Complete Shibboleth SSO infrastructure
- IdP issuing SAML assertions with attributes
- SP validating assertions and creating sessions
- Automatic authentication (Function flow)
- Session management with 8-hour lifetime
- Ready to pass attributes to Next.js application

**⏳ What's Next**:
- Integrate Next.js application to read Shibboleth headers
- Map attributes to StudyCAT user roles
- Create JWT tokens for authenticated sessions
- Update UI to support Shibboleth login flow

**🎯 Success Criteria**:
Your SSO implementation is fully working when you can:
1. Visit `https://sp.studycat.local/`
2. Log in with test credentials (e.g., `student` / `password123`)
3. See session with attributes at `/Shibboleth.sso/Session`
4. Test all three user types (student, instructor, admin)
5. Next.js app receives Shibboleth headers
6. StudyCAT application creates user session based on headers and affiliations

---

**Last Updated**: January 27, 2026  
**Version**: 1.0  
**Status**: ✅ Infrastructure Complete, Ready for Application Integration
