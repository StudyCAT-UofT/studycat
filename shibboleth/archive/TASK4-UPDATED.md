# Task 4: Set Up Service Provider (SP) - COMPLETE ✅

## ✨ Updated Approach: Using jefferyb/shibboleth-sp

Instead of building from scratch, we successfully used the pre-built [jefferyb/shibboleth-sp](https://github.com/jefferyb/docker-shibboleth) image as a base. This approach is:
- ✅ **Simpler** - Less code to maintain
- ✅ **More Reliable** - Pre-tested and maintained
- ✅ **Faster** - Builds in seconds vs minutes
- ✅ **Configurable** - Uses environment variables

---

## 📋 What We Built

### Docker Image: `studycat-sp:latest`

**Base Image**: `jefferyb/shibboleth-sp` (maintained, pre-configured with Apache + Shibboleth)

**Our Customizations**:
1. SSL/TLS certificates for HTTPS
2. Shibboleth SP certificates for SAML
3. IdP metadata (downloaded from running IdP)
4. Environment variables for StudyCAT configuration

---

## 🔧 Configuration Summary

### Environment Variables (Set in Dockerfile & Docker Compose)

```yaml
HOSTNAME: sp.studycat.local                # SP hostname
SERVICE_TO_PROTECT: host.docker.internal    # Next.js app location
SERVICE_PORT: 3000                          # Next.js port
IDP_ENTITY_ID: https://idp.studycat.local/idp/shibboleth
IDP_METADATA_URL: https://idp.studycat.local:4443/idp/shibboleth
SUPPORT_EMAIL: admin@studycat.local
SHIB_METADATA_BACKUP_URL: https://idp.studycat.local:4443/idp/shibboleth
SHIB_DOWNLOAD_METADATA: true                # Auto-download IdP metadata at startup
```

### Certificates Included

| Certificate | Purpose | Location in Image |
|------------|---------|-------------------|
| `sp-cert.pem` | HTTPS (Apache SSL) | `/etc/apache2/ssl/ssl.crt` |
| `sp-key.pem` | HTTPS (Apache SSL) | `/etc/apache2/ssl/ssl.key` |
| `sp-signing-cert.pem` | SAML signing | `/etc/shibboleth/sp-cert.pem` |
| `sp-signing-key.pem` | SAML signing | `/etc/shibboleth/sp-key.pem` |
| `idp-metadata.xml` | IdP metadata | `/etc/shibboleth/idp-metadata.xml` |

---

## ✅ Build & Test Results

### Build

```bash
cd shibboleth/sp
docker build -t studycat-sp:latest .
```

**Result**: ✅ **SUCCESS** - Built in ~3 seconds

### Test Run

```bash
docker run -d --name studycat-sp-test \
  -p 9080:80 -p 9443:443 \
  --add-host host.docker.internal:host-gateway \
  studycat-sp:latest
```

**Result**: ✅ **SUCCESS**

**Verification**:
- ✅ Apache running (PID 429)
- ✅ shibd running (PID 561)
- ✅ Proxy configured → `http://host.docker.internal:3000`
- ✅ SP metadata accessible: `https://sp.studycat.local:9443/Shibboleth.sso/Metadata`
- ✅ IdP metadata downloaded successfully

---

## 🔄 How It Works

### jefferyb Image's Ansible Automation

The `jefferyb/shibboleth-sp` image uses Ansible playbooks to automatically:

1. **Configure Apache**:
   - Sets up reverse proxy to `SERVICE_TO_PROTECT:SERVICE_PORT`
   - Configures SSL/TLS with provided certificates
   - Creates Shibboleth protection on routes

2. **Configure Shibboleth**:
   - Updates `shibboleth2.xml` with our entity IDs
   - Downloads IdP metadata from `IDP_METADATA_URL`
   - Configures metadata backup location

3. **Start Services**:
   - Starts Apache HTTP daemon
   - Starts Shibboleth SP daemon (shibd)
   - Tails logs for monitoring

### Proxy Flow

```
User Request → https://sp.studycat.local
                    ↓
              Apache (Port 443)
                    ↓
              mod_shib checks session
                    ↓ (if authenticated)
              Reverse Proxy to:
              http://host.docker.internal:3000
                    ↓
              Next.js StudyCAT App
```

---

## 📦 Docker Compose Integration

Added SP service to `docker-compose.yml`:

```yaml
sp:
  image: studycat-sp:latest
  container_name: studycat_sp
  ports:
    - "80:80"      # HTTP (redirects to HTTPS)
    - "443:443"    # HTTPS (main access point)
  extra_hosts:
    - "host.docker.internal:host-gateway"
  environment:
    HOSTNAME: sp.studycat.local
    SERVICE_TO_PROTECT: host.docker.internal
    SERVICE_PORT: "3000"
    IDP_ENTITY_ID: https://idp.studycat.local/idp/shibboleth
    IDP_METADATA_URL: https://idp.studycat.local:4443/idp/shibboleth
    SUPPORT_EMAIL: admin@studycat.local
    SHIB_METADATA_BACKUP_URL: https://idp.studycat.local:4443/idp/shibboleth
    SHIB_DOWNLOAD_METADATA: "true"
  profiles: ["shibboleth"]
  depends_on:
    - idp
  restart: unless-stopped
```

### Start the Full Stack

```bash
# Start both IdP and SP
docker compose --profile shibboleth up -d

# Check services
docker ps | grep studycat

# View logs
docker compose logs -f sp
docker compose logs -f idp
```

---

## 🎯 What's Configured Automatically

The jefferyb image automatically configures:

### ✅ Apache Virtual Hosts (HTTP & HTTPS)

**HTTP (Port 80)**:
- Redirects to HTTPS

**HTTPS (Port 443)**:
- Reverse proxy to Next.js app
- Shibboleth protection on `/` location
- Requires authentication (`AuthType shibboleth`)
- Exports attributes as environment variables

### ✅ Shibboleth SP (`shibboleth2.xml`)

- **Entity ID**: `https://sp.studycat.local/shibboleth`
- **IdP SSO**: `https://idp.studycat.local/idp/shibboleth`
- **Metadata Provider**: Auto-downloads from IdP
- **Session**: Cookie-based, 8-hour lifetime
- **Handlers**: Login, Logout, Metadata, Status

### ✅ Attribute Mapping

Uses default `attribute-map.xml` which includes:
- `eppn` (eduPersonPrincipalName)
- `uid` (username)
- `mail` (email)
- `displayName`
- `affiliation` (role)

These are exported as environment variables and HTTP headers.

---

## 🔍 Verification Steps Completed

| Check | Result | Notes |
|-------|--------|-------|
| Docker build | ✅ Pass | No errors, ~3 seconds |
| Container starts | ✅ Pass | Both Apache & shibd running |
| Apache running | ✅ Pass | PID 429, listening on 80/443 |
| shibd running | ✅ Pass | PID 561, daemon active |
| Proxy configured | ✅ Pass | Points to `host.docker.internal:3000` |
| IdP metadata downloaded | ✅ Pass | File present at `/etc/shibboleth/idp-metadata.xml` |
| SP metadata accessible | ✅ Pass | `https://sp.studycat.local:9443/Shibboleth.sso/Metadata` |
| SSL certificates | ✅ Pass | Self-signed, valid |

---

## 📁 Final File Structure

```
shibboleth/sp/
├── certificates/
│   ├── sp-cert.pem                 # ✅ HTTPS cert
│   ├── sp-key.pem                  # ✅ HTTPS key
│   ├── sp-signing-cert.pem         # ✅ SAML signing cert
│   ├── sp-signing-key.pem          # ✅ SAML signing key
│   ├── sp-encrypt-cert.pem         # (not used with jefferyb)
│   └── sp-encrypt-key.pem          # (not used with jefferyb)
├── config/
│   ├── idp-metadata.xml            # ✅ Downloaded from IdP
│   ├── shibboleth2.xml             # (optional override - not used)
│   ├── attribute-map.xml           # (optional override - not used)
│   ├── attribute-policy.xml        # (not needed with jefferyb)
│   └── apache-studycat.conf        # (not needed - auto-configured)
├── Dockerfile                       # ✅ Updated to use jefferyb base
├── start.sh                         # (not needed - jefferyb handles it)
├── .dockerignore                    # ✅ Build exclusions
├── TASK4-SUMMARY.md                 # Original task docs
└── TASK4-UPDATED.md                 # This file
```

---

## 🎉 Task 4 Status: COMPLETE

**What We Achieved**:
- ✅ SP Docker image built successfully using `jefferyb/shibboleth-sp`
- ✅ SP container tested and verified working
- ✅ Apache + Shibboleth running correctly
- ✅ Reverse proxy configured to Next.js app
- ✅ IdP metadata downloaded and configured
- ✅ SP metadata accessible for IdP configuration
- ✅ Docker Compose updated with SP service
- ✅ Ready for metadata exchange (Task 5)

---

## 🚀 Next Steps: Task 5 - Metadata Exchange

Now that both IdP and SP are running, we need to complete the trust relationship:

### Step 1: Extract SP Metadata

```bash
# Get SP metadata
curl -k https://sp.studycat.local/Shibboleth.sso/Metadata \
  > sp-metadata.xml
```

### Step 2: Configure IdP with SP Metadata

Add SP metadata to IdP's metadata providers in `idp/customized-shibboleth-idp/conf/metadata-providers.xml`:

```xml
<MetadataProvider id="LocalMetadata"  xsi:type="FilesystemMetadataProvider" 
                  metadataFile="/opt/shibboleth-idp/metadata/sp-metadata.xml"/>
```

### Step 3: Restart Services

```bash
# Rebuild IdP with updated metadata
cd shibboleth/idp
docker build -t studycat-idp:latest .

# Restart both services
docker compose --profile shibboleth down
docker compose --profile shibboleth up -d
```

### Step 4: Test SSO Flow

```bash
# Visit protected route (should redirect to IdP)
curl -L -k https://sp.studycat.local/quizzes

# Should see login page
```

---

## 📚 Resources

- [jefferyb/docker-shibboleth Repository](https://github.com/jefferyb/docker-shibboleth)
- [Shibboleth SP Documentation](https://wiki.shibboleth.net/confluence/display/SP3/Home)
- StudyCAT Setup Progress: `shibboleth/SETUP-PROGRESS.md`
- SP Setup Guide: `shibboleth/SP-SETUP-GUIDE.md`

---

## 💡 Key Takeaways

1. **Using pre-built images saves time** - The jefferyb image handled all the complex Apache + Shibboleth configuration automatically.

2. **Environment variables > config files** - Much easier to manage and modify.

3. **Metadata management is key** - Both IdP and SP need each other's metadata for trust.

4. **Port conflicts matter** - Had to use non-standard ports (9080/9443) during testing to avoid IdP conflicts.

5. **Docker networking** - `host.docker.internal:host-gateway` allows SP container to reach Next.js on the host.

---

**Task 4: COMPLETE ✅**  
**Ready for: Task 5 - Metadata Exchange**
