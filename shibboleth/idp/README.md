# StudyCAT Shibboleth Identity Provider (IdP)

This directory contains the configuration and Docker image for a mock Shibboleth Identity Provider used for testing SSO authentication before integrating with UofT's UTORid system.

## 🏗️ Architecture

```
┌─────────────────┐
│   User Browser  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌──────────────────┐
│  Service Provider│◄────►│  Identity Provider│
│    (SP)         │ SAML │      (IdP)        │
│  Port: TBD      │      │  Port: 4443, 8443│
└────────┬────────┘      └──────────────────┘
         │                        ↑
         ↓                        │
┌─────────────────┐              │
│  StudyCAT App   │              │
│  Port: 3000     │              │
└─────────────────┘              │
                                 │
                    Authenticates against:
                    ┌──────────────┐
                    │   OpenLDAP   │
                    │  Port: 389   │
                    │  (Test Users)│
                    └──────────────┘
```

## 📁 Directory Structure

```
idp/
├── Dockerfile                           # Docker image definition
├── .dockerignore                        # Files to exclude from build
├── customized-shibboleth-idp/          # IdP configuration
│   ├── conf/
│   │   ├── attribute-filter.xml        # Attribute release policy
│   │   ├── attribute-resolver.xml      # User attribute mapping (LDAP)
│   │   ├── idp.properties             # IdP settings
│   │   ├── ldap.properties            # LDAP connection configuration
│   │   └── authn/
│   │       └── password-authn-config.xml  # LDAP authentication
│   ├── credentials/
│   │   ├── idp-browser.p12            # Browser TLS certificate
│   │   ├── idp-backchannel.p12        # Backchannel TLS certificate
│   │   └── [other credential files]
│   ├── metadata/
│   │   └── idp-metadata.xml           # IdP SAML metadata
│   ├── views/                          # Login page templates
│   └── webapp/                         # Web assets (CSS, images)
├── key.pem                             # Certificate private key (can be deleted)
├── certificate.pem                     # Certificate (can be deleted)
└── README.md                           # This file
```

## 🧪 Test Users

Three test users are configured in OpenLDAP with Password authentication:

| Username   | Password     | Email                      | Affiliations | StudyCAT Role |
|------------|--------------|----------------------------|--------------|---------------|
| student    | password123  | student@studycat.local     | member, student | Student       |
| instructor | password123  | instructor@studycat.local  | member, faculty, staff | Instructor    |
| admin      | password123  | admin@studycat.local       | member, staff, employee | Admin         |

**Note:** Affiliations are mapped based on username in the IdP's attribute resolver. The StudyCAT application should use these affiliations for role-based access control.

## 🔑 Credentials & Passwords

**IdP Keystore Passwords**: `abc123`
- PKCS12 keystore password (browser)
- PKCS12 keystore password (backchannel)
- Sealer keystore password

**OpenLDAP Admin Password**: `admin123`

**Test User Passwords**: All users have password `password123`

## 🚀 Building the Image

The image has already been built, but to rebuild:

```bash
cd shibboleth/idp
docker build -t studycat-idp:latest .
```

## 🏃 Running the IdP

### Option 1: Using Docker Compose (Recommended)

```bash
# From project root
docker compose --profile shibboleth up -d
```

This starts the IdP alongside other services.

### Option 2: Standalone Docker Run

```bash
docker run -d \
  --name studycat-idp \
  -p 4443:4443 \
  -p 8443:8443 \
  -e JETTY_BROWSER_SSL_KEYSTORE_PASSWORD=abc123 \
  -e JETTY_BACKCHANNEL_SSL_KEYSTORE_PASSWORD=abc123 \
  -e JETTY_MAX_HEAP=1024m \
  studycat-idp:latest
```

## 🔍 Verifying the IdP

### Check Container Status

```bash
docker ps | grep studycat-idp
```

### View Logs

```bash
docker logs -f studycat-idp
```

Look for: `Started @[number]ms` indicating successful startup.

### Test Metadata Endpoint

```bash
curl -k https://idp.studycat.local:4443/idp/shibboleth
```

Should return XML metadata starting with `<EntityDescriptor>`.

### Test Login Page (After SP is configured)

Visit: `https://idp.studycat.local:4443/idp/profile/SAML2/Unsolicited/SSO?providerId=<SP_ENTITY_ID>`

## 📡 Ports

| Port | Purpose                | Access                    |
|------|------------------------|---------------------------|
| 4443 | Browser TLS (HTTPS)   | User-facing login page    |
| 8443 | Backchannel TLS       | SP ↔ IdP communication    |
| 8080 | HTTP (unused)         | Not exposed externally    |

## 🔧 Configuration Details

### Entity ID
```
https://idp.studycat.local/idp/shibboleth
```

### Scope
```
studycat.local
```

### Attributes Released

The IdP sends these attributes to Service Providers:

| SAML Attribute                 | Value/Source              | Description               |
|--------------------------------|---------------------------|---------------------------|
| `eduPersonPrincipalName`      | `username@studycat.local` | Unique identifier         |
| `uid`                         | `username`                | Username                  |
| `mail`                        | `username@studycat.local` | Email address             |
| `displayName`                 | `username`                | Display name              |
| `eduPersonAffiliation`        | `member`, `student`       | Role affiliation (unscoped)|
| `eduPersonScopedAffiliation`  | `member@studycat.local`   | Role affiliation (scoped) |

## 🐛 Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker logs studycat-idp
```

**Common issues:**
- Certificate password mismatch → Check environment variables
- Port already in use → `lsof -i :4443` or `docker ps`

### 503 Error When Accessing IdP

- Wait 10-15 seconds after container start for initialization
- Check logs for errors: `docker logs studycat-idp`

### "Operation Not Permitted" during build

- Run with proper permissions
- Check Docker daemon is running

### Platform Warning (linux/amd64 vs linux/arm64)

This is expected on M1/M2 Macs and will work fine with Docker's emulation.

## 🔄 Updating Configuration

To update IdP configuration:

1. Modify files in `customized-shibboleth-idp/conf/`
2. Rebuild the image: `docker build -t studycat-idp:latest .`
3. Stop and remove old container: `docker stop studycat-idp && docker rm studycat-idp`
4. Start new container with updated image

## 📝 Important Notes

1. **Self-Signed Certificates**: The IdP uses self-signed certificates. Browsers will show security warnings - this is expected for development.

2. **Legacy PKCS12 Format**: Certificates use legacy encryption (`-legacy` flag) for compatibility with older Java versions in the IdP.

3. **Static Affiliations**: All users get "member" and "student" affiliations. Role differentiation happens in the StudyCAT application.

4. **Not Production Ready**: This is a MOCK IdP for testing. In production, you'll use UofT's real Shibboleth IdP.

## 🎯 Next Steps

After the IdP is running, you need to:

1. **Set up the Service Provider (SP)** - Sits between the app and IdP
2. **Exchange metadata** - SP ↔ IdP metadata exchange
3. **Configure the StudyCAT application** - Handle Shibboleth headers
4. **Test the full SSO flow** - End-to-end authentication

## 📚 References

- [Unicon Shibboleth IdP Docker Image](https://github.com/Unicon/shibboleth-idp-dockerized)
- [Shibboleth Documentation](https://wiki.shibboleth.net/)
- [SAML 2.0 Overview](https://en.wikipedia.org/wiki/SAML_2.0)

## 🔐 Security

⚠️ **WARNING**: This configuration is for **DEVELOPMENT/TESTING ONLY**:

- Uses simple passwords (`abc123`, `password123`)
- Releases all attributes to any SP (no filtering)
- Uses self-signed certificates
- No rate limiting or security hardening

**Never use this in production!**
