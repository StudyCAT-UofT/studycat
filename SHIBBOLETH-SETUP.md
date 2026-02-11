# Shibboleth SSO Setup Guide for StudyCAT

This guide provides step-by-step instructions for setting up Shibboleth Single Sign-On (SSO) authentication for the StudyCAT application in a development environment.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [Testing the Setup](#testing-the-setup)
6. [Troubleshooting](#troubleshooting)
7. [How It Works](#how-it-works)
8. [Production Considerations](#production-considerations)

---

## Architecture Overview

```
┌─────────────┐      HTTPS       ┌──────────────┐      HTTPS      ┌─────────────┐
│   Browser   │ ←──────────────→ │  Shibboleth  │ ←──────────────→│     IdP     │
│             │  sp.studycat.     │      SP      │  idp.studycat.  │  (OpenLDAP) │
└─────────────┘     local         │   (Apache)   │     local       └─────────────┘
                                  └──────────────┘
                                         │
                                         │ HTTP Proxy
                                         │ (passes headers)
                                         ↓
                                  ┌──────────────┐
                                  │   Next.js    │
                                  │  Application │
                                  │  (port 3000) │
                                  └──────────────┘
```

**Components:**
- **Identity Provider (IdP)**: Authenticates users via OpenLDAP, issues SAML assertions
- **Service Provider (SP)**: Apache with mod_shib, protects the application, validates SAML assertions
- **OpenLDAP**: Directory server storing test user credentials
- **Next.js Application**: The StudyCAT application backend
- **PostgreSQL Database**: Stores user and application data

---

## Prerequisites

### Required Software
- **Docker & Docker Compose** (v2.0+)
- **Node.js** (v18+) and **pnpm**
- **OpenSSL** (for certificate generation)
- **A text editor** for configuration files

### Required Permissions
- Ability to modify `/etc/hosts` file (requires sudo)
- Ports 3000, 4443, 9443, and 5432 available

---

## Quick Start

### 1. Add Host Entries

Edit `/etc/hosts` (requires sudo on Mac/Linux, run as Administrator on Windows):

```bash
sudo nano /etc/hosts
```

Add these lines:

```
127.0.0.1   idp.studycat.local
127.0.0.1   sp.studycat.local
```

### 2. Generate Certificates

Since security certificates are unique to each environment and excluded from Git, every developer must generate their own local certificates.

#### Generate SP Certificates

```bash
# Create directory
mkdir -p shibboleth/sp/certificates
cd shibboleth/sp/certificates

# Generate SP certificates (for Apache HTTPS and SAML signing)
openssl req -x509 -newkey rsa:3072 \
  -keyout sp-key.pem \
  -out sp-cert.pem \
  -days 3650 \
  -nodes \
  -subj "/CN=sp.studycat.local"

# Copy to create signing certificates (same keypair used for SAML signing)
cp sp-cert.pem sp-signing-cert.pem
cp sp-key.pem sp-signing-key.pem

# Fix permissions (Unix/Mac only, skip on Windows)
chmod 600 sp-key.pem sp-signing-key.pem

cd ../../..
```

#### Update the IdP with Your New SP Certificate

> **⚠️ Important:** Whenever you generate new SP certificates, you MUST update the IdP's SP metadata file with your new public certificate. The IdP encrypts SAML assertions using your SP's public key—if they don't match, authentication will fail with "Unable to resolve any key decryption keys".

1. Open your newly generated `shibboleth/sp/certificates/sp-cert.pem` in a text editor.

2. Copy the certificate content between (but not including) the `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines.

3. Open `shibboleth/idp/customized-shibboleth-idp/metadata/sp-metadata.xml`.

4. Find the `<ds:X509Certificate>` tag and replace its contents with the certificate string you copied.

5. Rebuild and restart the IdP to load the new metadata:
   ```bash
   docker compose --profile shibboleth build idp
   docker compose --profile shibboleth up -d idp
   ```

#### Generate IdP Credentials

```bash
# Create credentials directory
mkdir -p shibboleth/idp/customized-shibboleth-idp/credentials
cd shibboleth/idp/customized-shibboleth-idp/credentials

# Generate signing key/cert
openssl req -newkey rsa:2048 -nodes -keyout idp-signing.key -x509 -days 365 -out idp-signing.crt \
  -subj "/CN=idp.studycat.local"

# Generate encryption key/cert
openssl req -newkey rsa:2048 -nodes -keyout idp-encryption.key -x509 -days 365 -out idp-encryption.crt \
  -subj "/CN=idp.studycat.local"

# Generate browser TLS certificate (PKCS12 format for Jetty)
openssl req -newkey rsa:2048 -nodes -keyout idp-browser.key -x509 -days 365 -out idp-browser.crt \
  -subj "/CN=idp.studycat.local"
openssl pkcs12 -export -legacy -inkey idp-browser.key -in idp-browser.crt \
  -out idp-browser.p12 -password pass:abc123

# Generate backchannel TLS certificate (PKCS12 format for Jetty)
openssl req -newkey rsa:2048 -nodes -keyout idp-backchannel.key -x509 -days 365 -out idp-backchannel.crt \
  -subj "/CN=idp.studycat.local"
openssl pkcs12 -export -legacy -inkey idp-backchannel.key -in idp-backchannel.crt \
  -out idp-backchannel.p12 -password pass:abc123

# Generate sealer keystore (for cookie encryption) - requires Java
openssl rand -out sealer.kver 32
keytool -genseckey -alias secret1 -keyalg AES -keysize 128 -keystore sealer.jks \
  -storepass abc123 -keypass abc123 -storetype JCEKS

cd ../../../..
```

**Note:** The `keytool` command requires Java. If Java is not available, copy `sealer.jks` and `sealer.kver` from another developer who has generated them.

### 3. Start All Services

```bash
cd /path/to/studycat

# Start database, IdP, SP, and OpenLDAP
docker compose --profile shibboleth up -d --build

# Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# Start Next.js development server
pnpm dev
```

### 4. Test the Setup

1. Open browser: `https://sp.studycat.local/`
2. Click "Login"
3. Click "Login with UTORid"
4. Enter credentials:
   - **Username**: `student`
   - **Password**: `password123`
5. You should be logged in!

---

## Detailed Setup

### Step 1: Generate IdP Base Configuration

The IdP configuration is NOT stored in the repository—it must be generated locally using the Shibboleth IdP Docker image's built-in initialization script.

```bash
cd shibboleth/idp
docker run -it -v $(pwd):/ext-mount --rm unicon/shibboleth-idp:3.4.3 init-idp.sh
```

The script will prompt you for configuration values. Use these settings:

| Prompt | Value |
|--------|-------|
| Hostname | `idp.studycat.local` |
| SAML Entity ID | `https://idp.studycat.local/idp/shibboleth` |
| Attribute Scope | `studycat.local` |
| Backchannel PKCS12 Password | `abc123` |
| Re-enter password | `abc123` |
| Cookie Encryption Key Password | `abc123` |
| Re-enter password | `abc123` |

This creates the `customized-shibboleth-idp/` directory with default Shibboleth IdP configuration. You must then apply the customizations documented in the steps below.

> **Note:** The `customized-shibboleth-idp/` directory is gitignored. Each developer must generate and configure it locally.

### Step 2: Generate TLS Certificates

The IdP needs TLS certificates for browser and backchannel communication. These are generated in the Quick Start section above.

```bash
cd shibboleth/idp/customized-shibboleth-idp/credentials

# Generate browser certificate (valid for 1 year)
openssl req -newkey rsa:2048 -nodes -keyout idp-browser.key -x509 -days 365 -out idp-browser.crt \
  -subj "/CN=idp.studycat.local/O=StudyCAT/C=CA"

# Convert to PKCS12 format with legacy flag (for Java compatibility)
openssl pkcs12 -export -legacy -inkey idp-browser.key -in idp-browser.crt \
  -out idp-browser.p12 -password pass:abc123

# Generate backchannel certificate (valid for 1 year)
openssl req -newkey rsa:2048 -nodes -keyout idp-backchannel.key -x509 -days 365 -out idp-backchannel.crt \
  -subj "/CN=idp.studycat.local/O=StudyCAT/C=CA"

# Convert to PKCS12 format
openssl pkcs12 -export -legacy -inkey idp-backchannel.key -in idp-backchannel.crt \
  -out idp-backchannel.p12 -password pass:abc123
```

**Important Notes:**
- Use `-legacy` flag for PKCS12 generation (required for older Java versions)
- Password is `abc123` (configured in Docker Compose)
- Certificates are self-signed for development

### Step 3: Configure IdP Properties

Edit `customized-shibboleth-idp/conf/idp.properties` and set these values:

```properties
# Line ~11: Set entity ID
idp.entityID=https://idp.studycat.local/idp/shibboleth

# Line ~18: Set scope (used for scoped attributes like eppn)
idp.scope=studycat.local

# Lines ~47-48: Set sealer passwords (for cookie encryption)
idp.sealer.storePassword=abc123
idp.sealer.keyPassword=abc123

# Line ~122: Enable only password authentication
idp.authn.flows=Password
```

### Step 3b: Configure LDAP Properties

Edit `customized-shibboleth-idp/conf/ldap.properties`:

```properties
# Line ~5: Set authenticator type
idp.authn.LDAP.authenticator=bindSearchAuthenticator

# Line ~8: LDAP URL (Docker internal DNS)
idp.authn.LDAP.ldapURL=ldap://ldap:389

# Lines ~9-10: Disable TLS (internal Docker network)
idp.authn.LDAP.useStartTLS=false
idp.authn.LDAP.useSSL=false

# Line ~30: Base DN for user search
idp.authn.LDAP.baseDN=ou=people,dc=studycat,dc=local

# Line ~32: User filter
idp.authn.LDAP.userFilter=(uid={user})

# Lines ~35-36: Bind credentials for searching
idp.authn.LDAP.bindDN=cn=admin,dc=studycat,dc=local
idp.authn.LDAP.bindDNCredential=admin123

# Line ~40: DN format for direct authentication
idp.authn.LDAP.dnFormat=uid=%s,ou=people,dc=studycat,dc=local
```

### Step 3c: Configure Attribute Resolver

The application only uses `uid` (username) for authentication, with `eppn` as a fallback. Replace `customized-shibboleth-idp/conf/attribute-resolver.xml` with this minimal configuration:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<AttributeResolver xmlns="urn:mace:shibboleth:2.0:resolver"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="urn:mace:shibboleth:2.0:resolver http://shibboleth.net/schema/idp/shibboleth-attribute-resolver.xsd">

    <!-- uid - username from authentication principal -->
    <AttributeDefinition id="uid" xsi:type="PrincipalName">
        <AttributeEncoder xsi:type="SAML2String" name="urn:oid:0.9.2342.19200300.100.1.1" friendlyName="uid" encodeType="false" />
    </AttributeDefinition>

    <!-- eduPersonPrincipalName (eppn) - scoped uid for fallback -->
    <AttributeDefinition id="eduPersonPrincipalName" xsi:type="Scoped" scope="%{idp.scope}">
        <InputAttributeDefinition ref="uid" />
        <AttributeEncoder xsi:type="SAML2ScopedString" name="urn:oid:1.3.6.1.4.1.5923.1.1.1.6" friendlyName="eduPersonPrincipalName" encodeType="false" />
    </AttributeDefinition>
</AttributeResolver>
```

### Step 3d: Configure Attribute Filter

Replace `customized-shibboleth-idp/conf/attribute-filter.xml` to release only the required attributes:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<AttributeFilterPolicyGroup id="ShibbolethFilterPolicy"
    xmlns="urn:mace:shibboleth:2.0:afp"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="urn:mace:shibboleth:2.0:afp http://shibboleth.net/schema/idp/shibboleth-afp.xsd">

    <AttributeFilterPolicy id="releaseToStudyCAT">
        <PolicyRequirementRule xsi:type="ANY" />
        <AttributeRule attributeID="uid" permitAny="true" />
        <AttributeRule attributeID="eduPersonPrincipalName" permitAny="true" />
    </AttributeFilterPolicy>
</AttributeFilterPolicyGroup>
```

### Step 3e: Configure Relying Party (Disable Encryption)

Edit `customized-shibboleth-idp/conf/relying-party.xml`. Find the `<util:list id="shibboleth.RelyingPartyOverrides">` section and add:

```xml
<!-- StudyCAT SP - disable assertion encryption for development -->
<bean parent="RelyingPartyByName" c:relyingPartyIds="https://sp.studycat.local/shibboleth">
    <property name="profileConfigurations">
        <list>
            <bean parent="SAML2.SSO" p:encryptAssertions="false" />
        </list>
    </property>
</bean>
```

**Why:** The IdP encrypts SAML assertions by default, which can cause "A valid authentication statement was not found" errors if certificates don't match perfectly. For development, disabling encryption simplifies troubleshooting.

### Step 3f: Configure Metadata Provider

Edit `customized-shibboleth-idp/conf/metadata-providers.xml`. Find the `<MetadataProvider id="ShibbolethMetadata">` element and add inside it:

```xml
<MetadataProvider id="StudyCATSP"
    xsi:type="FilesystemMetadataProvider"
    metadataFile="%{idp.home}/metadata/sp-metadata.xml"/>
```

### Step 3g: Download SP Metadata

After starting the SP, download its metadata for the IdP:

```bash
# Start SP first
docker compose --profile shibboleth up -d sp

# Wait for SP to be ready
sleep 5

# Download SP metadata into IdP
curl -k https://sp.studycat.local/Shibboleth.sso/Metadata > \
    shibboleth/idp/customized-shibboleth-idp/metadata/sp-metadata.xml
```

### Step 4: Set Up OpenLDAP Users

Test users are defined in `shibboleth/ldap/bootstrap.ldif`:

```ldif
# Student user
dn: uid=student,ou=people,dc=studycat,dc=local
objectClass: inetOrgPerson
objectClass: organizationalPerson
objectClass: person
uid: student
cn: student
sn: User
mail: student@studycat.local
displayName: student
userPassword: password123

# Instructor user
dn: uid=instructor,ou=people,dc=studycat,dc=local
objectClass: inetOrgPerson
objectClass: organizationalPerson
objectClass: person
uid: instructor
cn: instructor
sn: Teacher
mail: instructor@studycat.local
displayName: instructor
userPassword: password123

# Admin user
dn: uid=admin,ou=people,dc=studycat,dc=local
objectClass: inetOrgPerson
objectClass: organizationalPerson
objectClass: person
uid: admin
cn: admin
sn: Administrator
mail: admin@studycat.local
displayName: admin
userPassword: password123
```

### Step 5: Configure Service Provider (SP)

The SP configuration is in `shibboleth/sp/config/shibboleth2.xml`:

**Key settings:**
```xml
<ApplicationDefaults entityID="https://sp.studycat.local/shibboleth"
                     REMOTE_USER="uid remote_user eppn"
                     cipherSuites="DEFAULT:!EXP:!LOW:!aNULL:!eNULL:!DES:!IDEA:!SEED:!RC4:!3DES:!kRSA:!SSLv2:!SSLv3:!TLSv1:!TLSv1.1">

    <Sessions lifetime="28800" timeout="3600" relayState="ss:mem"
              checkAddress="false" handlerSSL="true" cookieProps="https">
        
        <!-- SessionInitiator for login -->
        <SessionInitiator type="Chaining" Location="/Login" isDefault="true" id="Login">
            <SessionInitiator type="SAML2" template="bindingTemplate.html"/>
        </SessionInitiator>
        
        <!-- AssertionConsumerService endpoints -->
        <md:AssertionConsumerService Location="/SAML2/POST" index="1"
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"/>
    </Sessions>
    
    <!-- Metadata Provider (IdP metadata) -->
    <MetadataProvider type="XML" validate="true"
        path="/etc/shibboleth/metadata/idp-metadata.xml"/>
</ApplicationDefaults>
```

### Step 6: Configure Apache Reverse Proxy

Apache configuration in `shibboleth/sp/config/apache-studycat.conf`:

```apache
<VirtualHost *:443>
    ServerName sp.studycat.local
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/shibboleth/sp-cert.pem
    SSLCertificateKeyFile /etc/shibboleth/sp-key.pem
    
    # Shibboleth handler (don't proxy)
    <Location /Shibboleth.sso>
        SetHandler shib
    </Location>
    
    # Protected callback endpoint
    <Location /api/auth/shibboleth/callback>
        AuthType shibboleth
        ShibRequestSetting requireSession 1
        Require valid-user
        ShibUseHeaders On
    </Location>
    
    # Reverse proxy to Next.js (using internal host and port 3000)
    ProxyPreserveHost On
    
    # Exclude Shibboleth handler from proxy
    ProxyPass /Shibboleth.sso !
    
    ProxyPass / http://host.docker.internal:3000/
    ProxyPassReverse / http://host.docker.internal:3000/
</VirtualHost>
```

**Note:** The actual configuration is dynamically patched at startup referencing:
- `shibboleth/sp/config/protected-routes.conf`: Defines protected paths and callback routes.
- `shibboleth/sp/config/shibboleth-headers.conf`: Maps SAML attributes to HTTP headers.

### Step 7: Configure Next.js Application

Update `.env` file:

```bash
# Authentication mode
NEXT_PUBLIC_AUTH_MODE=shibboleth

# JWT configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/studycat

# Shibboleth (optional overrides)
SHIBBOLETH_LOGIN_URL=https://sp.studycat.local/Shibboleth.sso/Login
```

### Step 8: Update Docker Compose

The `docker-compose.yml` already includes the Shibboleth services:

```yaml
services:
  # OpenLDAP directory server
  ldap:
    image: osixia/openldap:1.5.0
    environment:
      LDAP_ORGANISATION: "StudyCAT"
      LDAP_DOMAIN: "studycat.local"
      LDAP_ADMIN_PASSWORD: "admin123"
    volumes:
      - ./shibboleth/ldap/bootstrap.ldif:/container/service/slapd/assets/config/bootstrap/ldif/50-bootstrap.ldif
    profiles:
      - shibboleth

  # Identity Provider
  idp:
    build: ./shibboleth/idp
    ports:
      - "4443:4443"
    environment:
      JETTY_BROWSER_SSL_KEYSTORE_PASSWORD: abc123
      JETTY_BACKCHANNEL_SSL_KEYSTORE_PASSWORD: abc123
    depends_on:
      - ldap
    profiles:
      - shibboleth

  # Service Provider
  sp:
    build: ./shibboleth/sp
    ports:
      - "80:80"
      - "443:443"
    extra_hosts:
      - "host.docker.internal:host-gateway"  # Allow SP to reach Next.js
      - "idp.studycat.local:host-gateway"    # Allow SP to reach IdP
    environment:
      HOSTNAME: "sp.studycat.local"
      SERVICE_TO_PROTECT: "host.docker.internal"
      SERVICE_PORT: "3000"
      IDP_ENTITY_ID: "https://idp.studycat.local/idp/shibboleth"
      IDP_METADATA_URL: "https://idp.studycat.local:4443/idp/shibboleth"
      SHIB_DOWNLOAD_METADATA: "false"
    volumes:
      - ./shibboleth/sp/config/idp-metadata.xml:/etc/shibboleth/metadata/idp-metadata.xml:ro
      - ./shibboleth/sp/certificates/sp-key.pem:/etc/shibboleth/sp-key.pem:ro
      - ./shibboleth/sp/certificates/sp-cert.pem:/etc/shibboleth/sp-cert.pem:ro
      - ./shibboleth/sp/config/attribute-map.xml:/etc/shibboleth/attribute-map.xml:ro
    profiles:
      - shibboleth
```

### Step 9: Build and Start Services

```bash
# Build Docker images
docker compose --profile shibboleth build

# Start all services
docker compose --profile shibboleth up -d

# Check logs
docker compose logs -f idp
docker compose logs -f sp
docker compose logs -f ldap

# Verify services are running
docker compose ps
```

### Step 10: Set Up Database

```bash
# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# (Optional) Seed database with test data
pnpm db:seed

# NOTE: The seed script creates users that match the IdP test accounts:
# - student (password123)
# - instructor (password123)
```

---

## Testing the Setup

### Test 1: Verify Services

```bash
# Check IdP metadata is accessible
curl -k https://idp.studycat.local:4443/idp/shibboleth

# Check SP session endpoint
curl -k https://sp.studycat.local/Shibboleth.sso/Session

# Check LDAP is running
docker exec ldap ldapsearch -x -H ldap://localhost -b "ou=people,dc=studycat,dc=local" -D "cn=admin,dc=studycat,dc=local" -w admin123
```

### Test 2: End-to-End Login

1. **Start Next.js dev server:**
   ```bash
   pnpm dev
   ```

2. **Open browser:**
   ```
   https://sp.studycat.local/
   ```

3. **Click "Login" button** (you'll see "Access Denied" if not authenticated)

4. **Click "Login with UTORid"** button

5. **You'll be redirected to IdP login page**

6. **Enter credentials:**
   - Username: `student`
   - Password: `password123`

7. **After successful authentication:**
   - You'll be redirected back to `https://sp.studycat.local/`
   - You should see the application homepage
   - Your name/role should appear in the UI

### Test 3: Verify Session

```bash
# Check session API
curl -k https://sp.studycat.local/api/auth/session \
  -H "Cookie: session-token=YOUR_TOKEN_HERE"

# Should return:
# {"user": {"userId": "...", "email": "...", "role": "student", ...}}
```

### Test 4: Check Shibboleth Attributes

After logging in, visit:
```
https://sp.studycat.local/Shibboleth.sso/Session
```

You should see (simplified to only essential attributes):
```
Attributes:
- uid: student
- eppn: student@studycat.local
```

The application only uses `uid` for authentication (with `eppn` as fallback). Other attributes like mail, displayName, and affiliation are not needed.

---

## Troubleshooting

### Issue 1: "Too Many Redirects"

**Symptom:** Browser shows "This page isn't working - too many redirects"

**Cause:** Apache configuration issue with Shibboleth handlers

**Fix:**
1. Check `apache-studycat.conf` has `ProxyPass /Shibboleth.sso !`
2. Restart SP: `docker compose restart sp`

### Issue 2: Port Conflict (3000 vs 3001)

**Symptom:** `sp.studycat.local` fails to load, but `localhost:3001` works.

**Cause:** Port 3000 is occupied by another process (often Docker Desktop itself or a zombie node process), so Next.js falls back to port 3001. The SP is hardcoded to forward to port 3000.

**Fix:**
1. Find the process using port 3000: `lsof -i :3000`
2. Kill it: `kill -9 <PID>`
3. Restart development server: `pnpm dev`
4. Ensure it says "Ready on port 3000"

### Issue 3: "Access Denied" After Login

**Symptom:** Successfully log in at IdP but see "Access Denied" on homepage

**Causes:**
1. Cookie domain mismatch
2. Redirect to wrong URL
3. Session token not being set

**Fix:**
1. Check browser cookies - should see `session-token` for `sp.studycat.local`
2. Check Next.js logs for "Creating JWT token" message
3. Verify redirect URL in logs: should be `https://sp.studycat.local/`
4. Clear Shibboleth session: `https://sp.studycat.local/Shibboleth.sso/Logout`
5. Try login again

### Issue 3: IdP Shows 503 Error

**Symptom:** IdP page shows "HTTP ERROR 503"

**Causes:**
1. Attribute resolver configuration error
2. LDAP connection failure

**Fix:**
1. Check IdP logs: `docker compose logs idp`
2. Verify LDAP is running: `docker compose ps ldap`
3. Test LDAP connection:
   ```bash
   docker exec ldap ldapsearch -x -H ldap://localhost -b "dc=studycat,dc=local" -D "cn=admin,dc=studycat,dc=local" -w admin123
   ```

### Issue 4: Callback Not Executing

**Symptom:** No logs appear in Next.js terminal after IdP login

**Causes:**
1. Wrong redirect URL after authentication
2. Apache not proxying to Next.js

**Fix:**
1. Check where you land after IdP login - should be `/api/auth/shibboleth/callback`
2. If you land on `/`, the SessionInitiator `target` parameter is missing
3. Verify login button uses: `/Shibboleth.sso/Login?target=/api/auth/shibboleth/callback`

### Issue 5: LDAP Login Fails

**Symptom:** IdP shows "Login Failure: Invalid credentials"

**Causes:**
1. User doesn't exist in LDAP
2. Wrong password
3. LDAP not properly bootstrapped

**Fix:**
1. Check LDAP users:
   ```bash
   docker exec ldap ldapsearch -x -H ldap://localhost -b "ou=people,dc=studycat,dc=local" -D "cn=admin,dc=studycat,dc=local" -w admin123 uid
   ```
2. If empty, re-bootstrap LDAP:
   ```bash
   docker compose down ldap
   docker volume rm studycat_ldap_data studycat_ldap_config
   docker compose --profile shibboleth up -d ldap
   ```

### Issue 6: Certificate Errors

**Symptom:** "Your connection is not private" / SSL certificate errors

**Cause:** Self-signed certificates not trusted by browser

**Fix:** This is expected in development. Click "Advanced" → "Proceed to site" in your browser.

**For persistent fix:**
1. Import certificates into your system keychain (macOS/Linux)
2. Or use browser flags to accept self-signed certs on localhost

### Issue 7: "Unable to resolve any key decryption keys"

**Symptom:** After authenticating at the IdP, you see an error page with "Unable to resolve any key decryption keys"

**Cause:** Your SP private key doesn't match the public certificate registered with the IdP. This typically happens when you regenerate SP certificates but don't update the IdP's `sp-metadata.xml`.

**Fix:**
1. Open your SP certificate: `shibboleth/sp/certificates/sp-cert.pem`
2. Copy the certificate content (between `BEGIN CERTIFICATE` and `END CERTIFICATE`)
3. Open `shibboleth/idp/customized-shibboleth-idp/metadata/sp-metadata.xml`
4. Replace the content of `<ds:X509Certificate>` with your certificate
5. Rebuild and restart the IdP:
   ```bash
   docker compose --profile shibboleth build --no-cache idp
   docker compose --profile shibboleth up -d idp
   ```

**Prevention:** Always update the IdP's sp-metadata.xml whenever you regenerate SP certificates.

### Issue 8: "Metadata instance was invalid at time of acquisition"

**Symptom:** SP logs show:
```
ERROR OpenSAML.MetadataProvider.XML : metadata instance was invalid at time of acquisition
CRIT Shibboleth.Application : error initializing MetadataProvider
```

**Cause:** The IdP metadata has expired. The `validUntil` attribute in the metadata XML is in the past.

**Fix:**
1. Check the current date and the `validUntil` date in `shibboleth/sp/config/idp-metadata.xml` and `shibboleth/idp/customized-shibboleth-idp/metadata/idp-metadata.xml`
2. Update the `validUntil` attribute to a future date (e.g., `validUntil="2027-02-10T00:00:00.000Z"`)
3. Rebuild and restart both IdP and SP:
   ```bash
   docker compose --profile shibboleth build --no-cache idp sp
   docker compose --profile shibboleth up -d idp sp
   ```

### Issue 9: Port Already in Use

**Symptom:** `docker compose up` fails with "port is already allocated"

**Fix:**
```bash
# Find what's using the port
lsof -i :443
lsof -i :4443

# Kill the process or change Docker port mappings
```

### Issue 10: SP Cannot Reach IdP (DNS Resolution)

**Symptom:** SP logs show:
```
ERROR XMLTooling.ParserPool : unable to connect socket for URL 'https://idp.studycat.local:4443/idp/shibboleth'
```

**Cause:** The SP container cannot resolve `idp.studycat.local` hostname.

**Fix:** Ensure `docker-compose.yml` has the `extra_hosts` entry for the SP service:
```yaml
sp:
  extra_hosts:
    - "host.docker.internal:host-gateway"
    - "idp.studycat.local:host-gateway"  # This line is required
```

Then rebuild and restart the SP:
```bash
docker compose --profile shibboleth up -d sp
```

### Issue 11: "Message was signed, but signature could not be verified"

**Symptom:** After authenticating at the IdP, you see:
```
opensaml::SecurityPolicyException at (https://sp.studycat.local/Shibboleth.sso/SAML2/POST)
Message was signed, but signature could not be verified.
```

**Cause:** The IdP's signing certificate in the metadata files doesn't match the actual certificate the IdP is using to sign assertions. This happens when IdP credentials are regenerated but the metadata files aren't updated.

**Fix:**
1. Get the current IdP signing certificate content:
   ```bash
   cat shibboleth/idp/customized-shibboleth-idp/credentials/idp-signing.crt
   ```

2. Update both metadata files with the new certificate:
   - `shibboleth/sp/config/idp-metadata.xml`
   - `shibboleth/idp/customized-shibboleth-idp/metadata/idp-metadata.xml`

   Replace the content of `<ds:X509Certificate>` tags in the `KeyDescriptor use="signing"` sections.

3. Do the same for the encryption certificate from `idp-encryption.crt`.

4. Rebuild and restart both services:
   ```bash
   docker compose --profile shibboleth up -d --build idp
   docker compose --profile shibboleth restart sp
   ```

**Prevention:** Whenever you regenerate IdP credentials, always update the certificates in both idp-metadata.xml files.

### Issue 12: "A valid authentication statement was not found"

**Symptom:** After authenticating at the IdP, you see:
```
opensaml::FatalProfileException at (https://sp.studycat.local/Shibboleth.sso/SAML2/POST)
A valid authentication statement was not found in the incoming message.
```

**Cause:** The IdP encrypts SAML assertions by default, and the SP may have trouble decrypting them (especially if certificates don't match or there are compatibility issues).

**Fix:** Disable assertion encryption for development by adding a relying party override in `shibboleth/idp/customized-shibboleth-idp/conf/relying-party.xml`:

```xml
<util:list id="shibboleth.RelyingPartyOverrides">
    <!-- StudyCAT SP - disable encryption for development -->
    <bean parent="RelyingPartyByName" c:relyingPartyIds="https://sp.studycat.local/shibboleth">
        <property name="profileConfigurations">
            <list>
                <bean parent="SAML2.SSO" p:encryptAssertions="false" />
            </list>
        </property>
    </bean>
</util:list>
```

Then rebuild the IdP:
```bash
docker compose --profile shibboleth up -d --build idp
```

**Note:** In production with a real IdP, assertion encryption should remain enabled for security.

---

## How It Works

### Authentication Flow

1. **User visits application:**
   - Browser → `https://sp.studycat.local/`
   - No session found → Show "Access Denied"

2. **User clicks "Login with UTORid":**
   - Browser → `https://sp.studycat.local/Shibboleth.sso/Login?target=/api/auth/shibboleth/callback`
   - SP redirects to IdP

3. **User authenticates at IdP:**
   - Browser → `https://idp.studycat.local:4443/idp/...`
   - User enters username/password
   - IdP validates against LDAP

4. **IdP issues SAML assertion:**
   - IdP generates SAML response with user attributes
   - Browser POSTs SAML response to SP's AssertionConsumerService

5. **SP validates SAML assertion:**
   - SP verifies signature and issuer
   - Creates local Shibboleth session
   - Redirects to target URL: `/api/auth/shibboleth/callback`

6. **Application callback creates JWT:**
   - Next.js reads Shibboleth attributes from HTTP headers
   - Finds/creates user in database
   - Creates JWT token with user info
   - Sets `session-token` cookie
   - Redirects to homepage

7. **Subsequent requests:**
   - Browser sends `session-token` cookie
   - Next.js validates JWT
   - User is authenticated!

### User Authentication

The application authenticates users by matching the `uid` header (username) against existing users in the database. User roles are **NOT** determined by Shibboleth affiliation attributes—they are managed through course enrollments in the database (`offeringRole`: STUDENT, INSTRUCTOR, TA).

While the IdP releases affiliation attributes and the SP forwards them as headers, the application only uses the username (`uid`) for authentication. The authentication callback is implemented in `app/api/auth/shibboleth/callback/route.ts`.

### Logout Behavior

StudyCAT implements **local logout only**—when a user logs out, only the application's JWT session is cleared while the Shibboleth IdP session remains active. This replicates the behavior of other university applications like MarkUs, since users typically don't expect logging out of a single application to sign them out of all university services. If a user logs out and clicks "Login" again, they will be automatically re-authenticated without entering credentials (until their IdP session expires).

### Key Files

**IdP (generated locally, not in git):**
- `shibboleth/idp/customized-shibboleth-idp/conf/idp.properties` - Core IdP settings (entity ID, scope, passwords)
- `shibboleth/idp/customized-shibboleth-idp/conf/ldap.properties` - LDAP connection settings
- `shibboleth/idp/customized-shibboleth-idp/conf/attribute-resolver.xml` - Defines uid and eppn attributes
- `shibboleth/idp/customized-shibboleth-idp/conf/attribute-filter.xml` - Releases uid and eppn to SP
- `shibboleth/idp/customized-shibboleth-idp/conf/relying-party.xml` - SP trust, encryption disabled
- `shibboleth/idp/customized-shibboleth-idp/conf/metadata-providers.xml` - References SP metadata

> **Note:** The `customized-shibboleth-idp/` directory is gitignored. See Step 1 and Steps 3-3g above for configuration instructions.

**SP (in git):**
- `shibboleth/sp/config/shibboleth2.xml` - SP configuration
- `shibboleth/sp/config/attribute-map.xml` - Maps uid and eppn to HTTP headers
- `shibboleth/sp/config/apache-studycat.conf` - Apache reverse proxy config
- `shibboleth/sp/config/idp-metadata.xml` - IdP metadata for trust

**Application:**
- `app/api/auth/shibboleth/callback/route.ts` - Handles SAML assertion, creates JWT
- `app/api/auth/session/route.ts` - Validates JWT session
- `app/login/page.tsx` - Login page with Shibboleth button
- `lib/auth.ts` - Session management utilities
- `lib/jwt.ts` - JWT creation and validation

---

## Production Considerations

### Security

1. **Use real certificates** (not self-signed):
   - Obtain SSL/TLS certificates from a trusted CA
   - Update IdP and SP certificates

2. **Secure secrets:**
   - Use environment variables for passwords
   - Don't commit secrets to version control
   - Use Docker secrets or external secret management

3. **Configure proper CORS:**
   - Restrict `allowedDevOrigins` in `next.config.ts`
   - Set proper `ALLOWED_HOSTS` for Apache

4. **Enable HTTPS everywhere:**
   - Force HTTPS for all connections
   - Set `secure: true` for cookies in production

5. **Harden Apache:**
   - Disable unnecessary modules
   - Configure security headers (CSP, HSTS, X-Frame-Options)
   - Enable rate limiting

### Integration with Real UTORid

1. **Replace OpenLDAP with real UTORid:**
   - Remove `ldap` service from Docker Compose
   - Update IdP `ldap.properties` to point to UofT's LDAP
   - Configure VPN if required

2. **Update IdP metadata:**
   - Register your SP with UofT's IdP
   - Obtain production IdP metadata
   - Replace `idp-metadata.xml`

3. **Configure attribute mapping:**
   - Map UTORid attributes to application attributes
   - Update `attribute-map.xml` and `attribute-resolver.xml`

4. **Update entity IDs:**
   - Use production domains (not `.local`)
   - Register entity IDs with UofT

### Scalability

1. **Use external session storage:**
   - Configure SP to use memcached or Redis
   - Update `shibboleth2.xml` `<StorageService>` section

2. **Load balancing:**
   - Use session affinity (sticky sessions)
   - Share SP keys across instances
   - Configure clustered session storage

3. **Database:**
   - Use managed PostgreSQL (RDS, Cloud SQL)
   - Configure connection pooling
   - Enable SSL for database connections

### Monitoring

1. **Log aggregation:**
   - Collect logs from IdP, SP, and application
   - Use ELK stack or similar

2. **Metrics:**
   - Monitor authentication success/failure rates
   - Track session durations
   - Alert on anomalies

3. **Health checks:**
   - Endpoint for IdP: `/idp/status`
   - Endpoint for SP: `/Shibboleth.sso/Session`
   - Application: `/api/health`

---

## Additional Resources

- [Shibboleth Documentation](https://wiki.shibboleth.net/)
- [SAML 2.0 Specification](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
- [Unicon Dockerized IdP](https://github.com/Unicon/shibboleth-idp-dockerized)
- [Docker Shibboleth SP](https://github.com/jefferyb/docker-shibboleth)
- [OpenLDAP Documentation](https://www.openldap.org/doc/)

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs: `docker compose logs -f`
3. Consult Shibboleth documentation
4. Contact the development team

---

**Last Updated:** February 11, 2026
**Version:** 2.0.0

> **Version 2.0 Changes:** IdP configuration is no longer stored in git. Developers must generate and configure it locally using the documented steps. Attribute configuration simplified to only `uid` and `eppn`.
