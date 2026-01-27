# Task 4: Set Up Service Provider (SP) - Configuration Complete ✅

## Overview

Successfully created all configuration files for a Shibboleth Service Provider (SP) that will sit between the StudyCAT application and the Identity Provider (IdP).

## ✅ Completed Steps

### 1. Created SP Directory Structure

```
shibboleth/sp/
├── certificates/        # SSL/TLS certificates
├── config/             # SP configuration files  
├── Dockerfile          # Docker image definition
├── start.sh           # Startup script
└── .dockerignore      # Build exclusions
```

### 2. Generated SP Certificates

Created three sets of certificates for different purposes:

| Certificate | Purpose | Files |
|------------|---------|-------|
| **HTTPS** | Apache SSL/TLS | `sp-cert.pem`, `sp-key.pem` |
| **SAML Signing** | Sign SAML requests | `sp-signing-cert.pem`, `sp-signing-key.pem` |
| **SAML Encryption** | Encrypt SAML assertions | `sp-encrypt-cert.pem`, `sp-encrypt-key.pem` |

All certificates are self-signed with 365-day validity.

### 3. Created shibboleth2.xml Configuration

**Location**: `config/shibboleth2.xml`

**Key Settings**:
- **Entity ID**: `https://sp.studycat.local/shibboleth`
- **Session Lifetime**: 8 hours (28800 seconds)
- **Session Timeout**: 1 hour (3600 seconds)
- **REMOTE_USER**: Set from `eppn`, `uid`, or `mail`
- **Handlers Configured**:
  - SessionInitiator (`/Login`)
  - AssertionConsumerService (`/SAML2/POST`, `/SAML2/Artifact`, etc.)
  - LogoutInitiator (`/Logout`)
  - SingleLogoutService (`/SLO/*`)
  - Status endpoint (`/Status`)
  - Session diagnostic (`/Session`)

**Metadata Provider**: Loads IdP metadata from `/etc/shibboleth/idp-metadata.xml`

**Credential Resolver**: Uses signing certificates for SAML signing

### 4. Created attribute-map.xml

**Location**: `config/attribute-map.xml`

Maps SAML attributes from IdP to internal attribute IDs:

| SAML Attribute | Internal ID | Description |
|----------------|-------------|-------------|
| `eduPersonPrincipalName` | `eppn` | Primary identifier (username@domain) |
| `uid` | `uid` | Username |
| `mail` | `mail` | Email address |
| `displayName` | `displayName` | User's display name |
| `eduPersonAffiliation` | `affiliation` | Role (student, faculty, staff) |
| `eduPersonScopedAffiliation` | `scoped-affiliation` | Scoped role |
| `cn` | `cn` | Common name |
| `sn` | `sn` | Surname |
| `givenName` | `givenName` | First name |

These attributes will be exported as environment variables and HTTP headers.

### 5. Created attribute-policy.xml

**Location**: `config/attribute-policy.xml`

**Policy**: Accept all attributes from any IdP (development mode)

- Permits all listed attributes
- No filtering for development/testing
- **Note**: In production, this should be restricted to trusted IdPs only

### 6. Created Apache Configuration

**Location**: `config/apache-studycat.conf`

**Features**:
1. **SSL/TLS Configuration**
   - Listens on port 443
   - Uses SP certificates
   - Modern SSL protocols only (TLS 1.2+)

2. **Shibboleth Integration**
   - Loads `mod_shib` module
   - Handles `/Shibboleth.sso` endpoints

3. **Protected Routes**
   - Requires authentication for: `/quizzes`, `/question-bank`, `/students`, `/analytics`, `/upload`, `/quiz`
   - Public routes: `/login`, `/api/auth/mode`

4. **Reverse Proxy**
   - Proxies to Next.js app at `http://host.docker.internal:3000`
   - Preserves host headers
   - Forwards Shibboleth attributes as HTTP headers:
     - `X-Remote-User`
     - `X-Remote-Eppn`
     - `X-Remote-Uid`
     - `X-Remote-Mail`
     - `X-Remote-DisplayName`
     - `X-Remote-Affiliation`
     - `X-Remote-Scoped-Affiliation`

5. **HTTP to HTTPS Redirect**
   - Port 80 redirects to port 443

### 7. Created Dockerfile

**Location**: `Dockerfile`

**Base Image**: CentOS 7

**Installed Components**:
- Apache HTTPD with mod_ssl
- Shibboleth SP (from OpenSUSE repository)
- mod_shib Apache module

**Configuration**:
- Copies all config files to `/etc/shibboleth/`
- Copies certificates with proper permissions
- Copies Apache configuration
- Sets up logging directories

**Ports Exposed**: 80 (HTTP), 443 (HTTPS)

### 8. Created Startup Script

**Location**: `start.sh`

**Functionality**:
1. Checks for IdP metadata (creates placeholder if missing)
2. Starts Shibboleth SP daemon (`shibd`)
3. Starts Apache HTTPD
4. Monitors both processes
5. Handles graceful shutdown on SIGTERM/SIGINT
6. Exits if either process crashes

---

## 📋 Files Created

| File | Purpose | Status |
|------|---------|--------|
| `certificates/sp-cert.pem` | HTTPS certificate | ✅ |
| `certificates/sp-key.pem` | HTTPS private key | ✅ |
| `certificates/sp-signing-cert.pem` | SAML signing certificate | ✅ |
| `certificates/sp-signing-key.pem` | SAML signing key | ✅ |
| `certificates/sp-encrypt-cert.pem` | SAML encryption certificate | ✅ |
| `certificates/sp-encrypt-key.pem` | SAML encryption key | ✅ |
| `config/shibboleth2.xml` | Main SP configuration | ✅ |
| `config/attribute-map.xml` | Attribute mapping | ✅ |
| `config/attribute-policy.xml` | Attribute filter policy | ✅ |
| `config/apache-studycat.conf` | Apache reverse proxy config | ✅ |
| `Dockerfile` | Docker image definition | ✅ |
| `start.sh` | Container startup script | ✅ |
| `.dockerignore` | Build exclusions | ✅ |

---

## 🔄 Authentication Flow

```
1. User visits: https://sp.studycat.local/quizzes
                    ↓
2. Apache sees Shibboleth protection on /quizzes
                    ↓
3. mod_shib checks for active session
                    ↓ (no session)
4. Redirect to IdP: https://idp.studycat.local:4443/idp/profile/SAML2/SSO
                    ↓
5. User logs in at IdP (htpasswd: student/password123)
                    ↓
6. IdP generates SAML assertion with attributes
                    ↓
7. IdP redirects back to SP: https://sp.studycat.local/Shibboleth.sso/SAML2/POST
                    ↓
8. mod_shib validates SAML assertion
                    ↓
9. mod_shib creates session and extracts attributes
                    ↓
10. mod_shib sets environment variables and HTTP headers
                    ↓
11. Apache proxies request to Next.js with headers:
    - X-Remote-User: student
    - X-Remote-Mail: student@studycat.local
    - X-Remote-Affiliation: member;student
                    ↓
12. Next.js app reads headers and authenticates user
                    ↓
13. User sees: https://sp.studycat.local/quizzes (authenticated)
```

---

## 🎯 Next Steps

### Before Building the Docker Image:

The current Dockerfile uses CentOS 7 which is EOL. Before proceeding, we have two options:

#### **Option A: Build Custom SP Image (Current Approach)**
- May require adjustments for modern base images
- Full control over configuration
- More complex to maintain

#### **Option B: Use Pre-built SP Image (Simpler)**
- Use `jefferyb/docker-shibboleth` or similar
- Mount our config files as volumes
- Less flexibility but easier to maintain

**Recommendation**: Try building the current Dockerfile first. If issues arise, switch to Option B.

### To Build and Test:

```bash
# 1. Build the SP image
cd shibboleth/sp
docker build -t studycat-sp:latest .

# 2. Run the SP container
docker run -d --name studycat-sp \
  -p 80:80 -p 443:443 \
  --add-host host.docker.internal:host-gateway \
  studycat-sp:latest

# 3. Check logs
docker logs -f studycat-sp

# 4. Test SP metadata endpoint
curl -k https://sp.studycat.local/Shibboleth.sso/Metadata
```

---

## ⚠️ Important Notes

### Missing IdP Metadata

The SP needs the IdP's metadata to know how to communicate with it. This will be added in **Task 5: Metadata Exchange**.

**Current State**: Placeholder created by `start.sh` if file doesn't exist.

**Required**: Real IdP metadata from `https://idp.studycat.local:4443/idp/shibboleth`

### Docker Networking

The Apache configuration uses `host.docker.internal:3000` to reach the Next.js app. This works on:
- ✅ Docker Desktop (Mac/Windows)
- ✅ Docker with `--add-host host.docker.internal:host-gateway`
- ❌ Plain Docker on Linux (needs different approach)

### Certificate Trust

All certificates are self-signed. Browsers will show security warnings. This is expected for development.

### Protected Routes

Currently protected routes: `/quizzes`, `/question-bank`, `/students`, `/analytics`, `/upload`, `/quiz`

To add more protected routes, edit `config/apache-studycat.conf`:

```apache
<LocationMatch "^/(your-route|another-route)">
    AuthType shibboleth
    ShibRequestSetting requireSession 1
    Require valid-user
    ShibUseHeaders On
</LocationMatch>
```

---

## 🔐 HTTP Headers Sent to StudyCAT App

When a user is authenticated, these headers are sent to the Next.js application:

```
X-Remote-User: student
X-Remote-Eppn: student@studycat.local
X-Remote-Uid: student
X-Remote-Mail: student@studycat.local
X-Remote-DisplayName: student
X-Remote-Affiliation: member;student
X-Remote-Scoped-Affiliation: member@studycat.local;student@studycat.local
```

The StudyCAT application (Person 2's work) will read these headers to:
1. Identify the user
2. Determine their role (student/instructor/admin)
3. Create or update user in database
4. Issue JWT token for session management

---

## 📚 Configuration Reference

### SP Entity ID
```
https://sp.studycat.local/shibboleth
```

### IdP Entity ID
```
https://idp.studycat.local/idp/shibboleth
```

### SP Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/Shibboleth.sso/Login` | Initiate login |
| `/Shibboleth.sso/Logout` | Initiate logout |
| `/Shibboleth.sso/Session` | View session info |
| `/Shibboleth.sso/Metadata` | SP metadata (for IdP) |
| `/Shibboleth.sso/Status` | SP status check |
| `/Shibboleth.sso/SAML2/POST` | Assertion consumer (main) |

---

## ✨ Task 4 Status: CONFIGURATION COMPLETE

All Service Provider configuration files have been created. The SP is ready for:
- Docker image build (may need adjustments)
- Metadata exchange with IdP (Task 5)
- Integration testing (Task 6)

**Ready to proceed to: Attempting to build Docker image or Task 5: Metadata Exchange**
