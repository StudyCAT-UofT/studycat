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
│             │  sp.studycat.    │      SP      │  idp.studycat.  │  (OpenLDAP) │
└─────────────┘     local        │   (Apache)   │     local       └─────────────┘
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
- **Service Provider (SP)**: Apache with [`mod_shib`](https://shibboleth.atlassian.net/wiki/spaces/SP3/pages/2065335062/Apache), protects the application, validates SAML assertions
- **OpenLDAP**: Directory server storing test user credentials
- **Next.js Application**: The StudyCAT application backend
- **SQL Server Database**: Stores user and application data

---

## Prerequisites

### Required Software
- **Docker & Docker Compose** (v2.0+)
- **Node.js** (v18+) and **pnpm**
- **OpenSSL** (for certificate generation)
- **Python 3** (for automated XML edits)
- **A text editor** for configuration files

### Required Permissions
- Ability to modify `/etc/hosts` file (requires sudo)
- Ports 3000, 1433, 4443, and 9443 available

---

## Setup instructions (run once)

### Step 1: Add Host Entries

Edit `/etc/hosts` (requires sudo on Mac/Linux, run as Administrator on Windows) to add these lines:

```
127.0.0.1   idp.studycat.local
127.0.0.1   sp.studycat.local
```

### Step 2: Generate IdP Base Configuration

The IdP configuration is NOT stored in the repository—it must be generated locally using the Shibboleth IdP Docker image's built-in initialization script.

```bash
docker compose --profile init run --rm idp-init
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

This creates the `shibboleth/idp/customized-shibboleth-idp/` directory with default Shibboleth IdP configuration. You must then apply the customizations documented in the steps below.

### Step 3: Generate TLS Certificates

Security certificates are unique to each environment and excluded from Git. Every developer must generate their own local certificates.

#### 3a. Generate SP Certificates

```bash
# Create directory
mkdir -p shibboleth/sp/certificates
cd shibboleth/sp/certificates

# Generate SP certificates (for Apache HTTPS and SAML signing)
openssl req -x509 -newkey rsa:3072 -keyout sp-key.pem -out sp-cert.pem -days 3650 -nodes -subj "/CN=sp.studycat.local"

# Copy to create signing certificates (same keypair used for SAML signing)
cp sp-cert.pem sp-signing-cert.pem
cp sp-key.pem sp-signing-key.pem

# Fix permissions (Unix/Mac only, skip on Windows)
chmod 600 sp-key.pem sp-signing-key.pem

cd ../../..
```

#### 3b. Update the IdP with Your New SP Certificate

> **⚠️ Important:** Whenever you generate new SP certificates, you MUST update the IdP's SP metadata file with your new public certificate. The IdP encrypts SAML assertions using your SP's public key—if they don't match, authentication will fail with "Unable to resolve any key decryption keys".

1. Open your newly generated `shibboleth/sp/certificates/sp-cert.pem` in a text editor.

2. Copy the certificate content between (but not including) the `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines.

3. Open `shibboleth/idp/customized-shibboleth-idp/metadata/sp-metadata.xml`.

4. Find the `<ds:X509Certificate>` tag and replace its contents with the certificate string you copied.

#### 3c. Generate IdP Credentials

```bash
# Create credentials directory
mkdir -p shibboleth/idp/customized-shibboleth-idp/credentials
cd shibboleth/idp/customized-shibboleth-idp/credentials

# Generate signing key/cert
openssl req -newkey rsa:2048 -nodes -keyout idp-signing.key -x509 -days 365 -out idp-signing.crt -subj "/CN=idp.studycat.local"

# Generate encryption key/cert
openssl req -newkey rsa:2048 -nodes -keyout idp-encryption.key -x509 -days 365 -out idp-encryption.crt -subj "/CN=idp.studycat.local"

# Generate browser TLS certificate (PKCS12 format for Jetty)
openssl req -newkey rsa:2048 -nodes -keyout idp-browser.key -x509 -days 365 -out idp-browser.crt -subj "/CN=idp.studycat.local"
openssl pkcs12 -export -legacy -inkey idp-browser.key -in idp-browser.crt -out idp-browser.p12 -password pass:abc123

# Generate backchannel TLS certificate (PKCS12 format for Jetty)
openssl req -newkey rsa:2048 -nodes -keyout idp-backchannel.key -x509 -days 365 -out idp-backchannel.crt -subj "/CN=idp.studycat.local"
openssl pkcs12 -export -legacy -inkey idp-backchannel.key -in idp-backchannel.crt -out idp-backchannel.p12 -password pass:abc123

# Generate sealer keystore (for cookie encryption) - requires Java
openssl rand -out sealer.kver 32
keytool -genseckey -alias secret1 -keyalg AES -keysize 128 -keystore sealer.jks -storepass abc123 -keypass abc123 -storetype JCEKS

cd ../../../..
```

**Note:** The `keytool` command requires the Java Development Kit (JDK) to be installed. If you do not have it installed, you can also use docker:

```bash
docker run --rm -v $(pwd):/work -w /work eclipse-temurin:21 keytool -genseckey -alias secret1 -keyalg AES -keysize 128 -keystore sealer.jks -storepass abc123 -keypass abc123 -storetype JCEKS
```

#### 3d. Rebuild and restart the IdP to load the new metadata

```bash
docker compose --profile shibboleth build idp
docker compose --profile shibboleth up -d idp
```

### Step 4: Configure IdP

All files in this step live under `shibboleth/idp/customized-shibboleth-idp/conf/` (created by Step 2).

#### 3a. Configure IdP Properties

Edit `shibboleth/idp/customized-shibboleth-idp/conf/idp.properties` to set the entity ID, scope, sealer configuration, and authentication flow.

```properties
idp.entityID=https://idp.studycat.local/idp/shibboleth  # Line 11

idp.scope=studycat.local  # Line 18

idp.sealer.storeType = JCEKS  # Line 42, UNCOMMENT THIS

idp.sealer.storePassword=abc123  # Line 47
idp.sealer.keyPassword=abc123  # Line 48

idp.authn.flows=Password  # Line 122
```

#### Step 3b: Configure LDAP Properties

Edit `shibboleth/idp/customized-shibboleth-idp/conf/ldap.properties` to point the IdP at the OpenLDAP container.

```properties
idp.authn.LDAP.authenticator                   = bindSearchAuthenticator  # Line 5
idp.authn.LDAP.ldapURL                         = ldap://ldap:389  # Line 8
idp.authn.LDAP.useStartTLS                     = false  # Line 9
idp.authn.LDAP.useSSL                          = false  # Line 10

idp.authn.LDAP.baseDN                           = ou=people,dc=studycat,dc=local  # Line 30
idp.authn.LDAP.userFilter                       = (uid={user})  # Line 32
idp.authn.LDAP.bindDN                           = cn=admin,dc=studycat,dc=local  # Line 35
idp.authn.LDAP.bindDNCredential                 = admin123  # Line 36
idp.authn.LDAP.dnFormat                         = uid=%s,ou=people,dc=studycat,dc=local  # Line 40
```

#### Step 3c: Configure Attribute Resolver

The application only uses `uid` (username) for authentication, with `eppn` as a fallback. Replace `shibboleth/idp/customized-shibboleth-idp/conf/attribute-resolver.xml` entirely:

```bash
cat > shibboleth/idp/customized-shibboleth-idp/conf/attribute-resolver.xml << 'EOF'
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
EOF
```

#### Step 3d: Configure Attribute Filter

Replace `shibboleth/idp/customized-shibboleth-idp/conf/attribute-filter.xml` to release only the required attributes:

```bash
cat > shibboleth/idp/customized-shibboleth-idp/conf/attribute-filter.xml << 'EOF'
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
EOF
```

#### Step 3e: Configure Relying Party (Disable Encryption)

Insert a StudyCAT-specific override into `shibboleth/idp/customized-shibboleth-idp/conf/relying-party.xml` to disable assertion encryption for development. This prevents "A valid authentication statement was not found" errors caused by certificate mismatches.

```bash
python3 << 'PYEOF'
with open('shibboleth/idp/customized-shibboleth-idp/conf/relying-party.xml', 'r') as f:
    content = f.read()
insert = '''
    <!-- StudyCAT SP - disable assertion encryption for development -->
    <bean parent="RelyingPartyByName" c:relyingPartyIds="https://sp.studycat.local/shibboleth">
        <property name="profileConfigurations">
            <list>
                <bean parent="SAML2.SSO" p:encryptAssertions="false" />
            </list>
        </property>
    </bean>'''
content = content.replace(
    '<util:list id="shibboleth.RelyingPartyOverrides">',
    '<util:list id="shibboleth.RelyingPartyOverrides">' + insert
)
with open('shibboleth/idp/customized-shibboleth-idp/conf/relying-party.xml', 'w') as f:
    f.write(content)
print("Done.")
PYEOF
```

#### Step 3f: Configure Metadata Provider

Replace `customized-shibboleth-idp/conf/metadata-providers.xml` entirely. The generated file's `ShibbolethMetadata` element is the root `ChainingMetadataProvider`—the `StudyCATSP` entry must go **inside** it as a child, not before it:

```bash
cat > shibboleth/idp/customized-shibboleth-idp/conf/metadata-providers.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<MetadataProvider id="ShibbolethMetadata" xsi:type="ChainingMetadataProvider"
    xmlns="urn:mace:shibboleth:2.0:metadata"
    xmlns:resource="urn:mace:shibboleth:2.0:resource"
    xmlns:security="urn:mace:shibboleth:2.0:security"
    xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="urn:mace:shibboleth:2.0:metadata http://shibboleth.net/schema/idp/shibboleth-metadata.xsd
                        urn:mace:shibboleth:2.0:resource http://shibboleth.net/schema/idp/shibboleth-resource.xsd
                        urn:mace:shibboleth:2.0:security http://shibboleth.net/schema/idp/shibboleth-security.xsd
                        urn:oasis:names:tc:SAML:2.0:metadata http://docs.oasis-open.org/security/saml/v2.0/saml-schema-metadata-2.0.xsd">

    <!-- StudyCAT SP - load metadata from local file -->
    <MetadataProvider id="StudyCATSP"
                      xsi:type="FilesystemMetadataProvider"
                      metadataFile="%{idp.home}/metadata/sp-metadata.xml" />

</MetadataProvider>
EOF
```

#### Step 3g: Download SP Metadata and Update IdP Metadata

Start the SP container first to expose its metadata endpoint, then download the metadata into the IdP. Also update the `validUntil` in both `idp-metadata.xml` files — the init script generates metadata that expires within minutes, which causes the SP to reject it:

```bash
# Start SP first
docker compose --profile shibboleth up -d sp

# Wait for SP to be ready
sleep 8

# Download SP metadata into IdP
curl -k https://sp.studycat.local/Shibboleth.sso/Metadata > shibboleth/idp/customized-shibboleth-idp/metadata/sp-metadata.xml

# Extend validUntil to 2099 in IdP Metadata
sed -i '' 's|validUntil="[^"]*"|validUntil="2099-01-01T00:00:00.000Z"|g' shibboleth/idp/customized-shibboleth-idp/metadata/idp-metadata.xml

# Fix SSO/SLO endpoint URLs to use port 4443 (the IdP's HTTPS port).
# The init script generates URLs without a port (defaulting to 443), but the IdP runs on 4443.
# IMPORTANT: only fix Location= URLs — do NOT change the entityID attribute.
python3 << 'PYEOF'
import re
path = 'shibboleth/idp/customized-shibboleth-idp/metadata/idp-metadata.xml'
with open(path) as f:
    content = f.read()
# Add :4443 to endpoint Location URLs only (not the entityID attribute)
content = re.sub(
    r'(Location="https://idp\.studycat\.local)(/idp/)',
    r'\1:4443\2',
    content
)
with open(path, 'w') as f:
    f.write(content)
print(f"Fixed endpoint ports in {path}")
PYEOF

# Update the SP's copy of idp-metadata.xml with the freshly-generated IdP certificates
cp shibboleth/idp/customized-shibboleth-idp/metadata/idp-metadata.xml shibboleth/sp/config/idp-metadata.xml
```

---

### Step 5: Testing the setup

Run the following to verify the setup of the services.

```bash
# Stop existing containers
docker compose --profile shibboleth stop

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

# Check IdP metadata is accessible
curl -k https://idp.studycat.local:4443/idp/shibboleth

# Check SP session endpoint
curl -k https://sp.studycat.local/Shibboleth.sso/Session

# Check LDAP is running
docker compose exec ldap ldapsearch -x -H ldap://localhost -b "ou=people,dc=studycat,dc=local" -D "cn=admin,dc=studycat,dc=local" -w admin123
```

### Step 6: Configure Next.js Application

Update your `.env` file with the following values.

```bash
AUTH_MODE=shibboleth
NEXT_PUBLIC_AUTH_MODE=shibboleth
ENABLE_MOCK_SHIBBOLETH=false

SHIBBOLETH_SP_URL=https://sp.studycat.local
SHIBBOLETH_LOGIN_URL=https://sp.studycat.local/Shibboleth.sso/Login
SHIBBOLETH_LOGOUT_URL=https://sp.studycat.local/Shibboleth.sso/Logout
```

---

## Starting the App (run each time)

```bash
# Start SQL Server database
docker compose up -d

# Start IdP, SP, and OpenLDAP
docker compose --profile shibboleth up -d --build

# Start quiz engine service (required for adaptive quizzes — in a separate terminal)
cd ../studycat-service && make run && cd ../studycat

# Start Next.js development server
pnpm dev
```

### Test End-to-End Login

With the services and Next.js app running, you can that the Shibboleth authentication is working by doing the following:

1. Open a browser to <https://sp.studycat.local>
   
2. **Click "Login" button** (you'll see "Access Denied" if not authenticated)

3. **Click "Login with UTORid" button**. You'll be redirected to IdP login page.

4. **Enter credentials**
   - Username: `instructor` or `student`
   - Password: `password`

If the authentication is successful, you'll be redirected back to <https://sp.studycat.local/>.
You should now see the StudyCAT application homepage and your name/role should appear in the UI.

#### Additional check: Shibboleth Attributes

After logging in, visit <https://sp.studycat.local/Shibboleth.sso/Session>.

You should see something similar to:

```
Miscellaneous
Session Expiration (barring inactivity): 461 minute(s)
Client Address: 172.23.0.1
SSO Protocol: urn:oasis:names:tc:SAML:2.0:protocol
Identity Provider: https://idp.studycat.local/idp/shibboleth
Authentication Time: 2026-04-15T18:48:04.867Z
Authentication Context Class: urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
Authentication Context Decl: (none)

Attributes
eppn: 1 value(s)
uid: 1 value(s)
```

### Additional check: verify session

When at `https://sp.studycat.local`, use your browser's Developer Tools to obtain the cookie value for `session-token`.
Then in the terminal, enter:

```bash
# Check session API
curl -k https://sp.studycat.local/api/auth/session -H "Cookie: session-token=YOUR_TOKEN_HERE"
```

You should see a JSON response of the form

```json
{"user":{"userId":"...","username":"<instructor/student>","iat":...,"exp":...}}
```

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

### Issue 4: IdP Shows 503 Error

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

### Issue 5: Callback Not Executing

**Symptom:** No logs appear in Next.js terminal after IdP login

**Causes:**
1. Wrong redirect URL after authentication
2. Apache not proxying to Next.js

**Fix:**
1. Check where you land after IdP login - should be `/api/auth/shibboleth/callback`
2. If you land on `/`, the SessionInitiator `target` parameter is missing
3. Verify login button uses: `/Shibboleth.sso/Login?target=/api/auth/shibboleth/callback`

### Issue 6: LDAP Login Fails

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

### Issue 7: Certificate Errors

**Symptom:** "Your connection is not private" / SSL certificate errors

**Cause:** Self-signed certificates not trusted by browser

**Fix:** This is expected in development. Click "Advanced" → "Proceed to site" in your browser.

**For persistent fix:**
1. Import certificates into your system keychain (macOS/Linux)
2. Or use browser flags to accept self-signed certs on localhost

### Issue 8: "Unable to resolve any key decryption keys"

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

### Issue 9: "Metadata instance was invalid at time of acquisition"

**Symptom:** SP logs show:
```
ERROR OpenSAML.MetadataProvider.XML : metadata instance was invalid at time of acquisition
CRIT Shibboleth.Application : error initializing MetadataProvider
```

**Cause:** The IdP metadata has expired. The `validUntil` attribute in the metadata XML is in the past. This commonly happens in two scenarios:
- The committed `shibboleth/sp/config/idp-metadata.xml` has an old `validUntil` date.
- The `init-idp.sh` script (Step 1) generates `idp-metadata.xml` with a `validUntil` only minutes in the future — if you don't run Step 3g promptly after Step 1, the newly-generated metadata will already be expired by the time the SP loads it.

**Fix:**
1. Check the `validUntil` date in both files:
   - `shibboleth/sp/config/idp-metadata.xml`
   - `shibboleth/idp/customized-shibboleth-idp/metadata/idp-metadata.xml`
2. Update the `validUntil` attribute to a future date in both files:
   ```bash
   sed -i '' 's|validUntil="[^"]*"|validUntil="2099-01-01T00:00:00.000Z"|g' \
       shibboleth/sp/config/idp-metadata.xml \
       shibboleth/idp/customized-shibboleth-idp/metadata/idp-metadata.xml
   ```
3. Rebuild and restart both IdP and SP:
   ```bash
   docker compose --profile shibboleth build --no-cache idp sp
   docker compose --profile shibboleth up -d idp sp
   ```

### Issue 10: Port Already in Use

**Symptom:** `docker compose up` fails with "port is already allocated"

**Fix:**
```bash
# Find what's using the port
lsof -i :443
lsof -i :4443

# Kill the process or change Docker port mappings
```

### Issue 11: SP Cannot Reach IdP (DNS Resolution)

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

### Issue 12: "Message was signed, but signature could not be verified"

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

### Issue 13: "A valid authentication statement was not found"

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

### Issue 14: IdP Login Page Returns 404

**Symptom:** Clicking "Login with UTORid" redirects to `https://idp.studycat.local/idp/profile/SAML2/Redirect/SSO?...` (no port) and the browser shows a 404 error.

**Cause:** The `idp-metadata.xml` SSO endpoint `Location` URLs are missing the `:4443` port. The `init-idp.sh` script generates metadata URLs without an explicit port (defaulting to the standard HTTPS port 443), but the IdP Docker container exposes HTTPS on port 4443.

**Diagnosis:** Check the `SingleSignOnService` entries in `shibboleth/sp/config/idp-metadata.xml`:
```bash
grep "SingleSignOnService" shibboleth/sp/config/idp-metadata.xml
```
If the `Location` URLs say `https://idp.studycat.local/idp/...` (no port), they need `:4443`.

**Fix:** Run this Python script to add `:4443` to endpoint `Location` URLs in both metadata files. It only targets `Location=` attributes so the `entityID` is not affected:
```bash
python3 << 'PYEOF'
import re
files = [
    'shibboleth/sp/config/idp-metadata.xml',
    'shibboleth/idp/customized-shibboleth-idp/metadata/idp-metadata.xml',
]
for path in files:
    with open(path) as f:
        content = f.read()
    content = re.sub(
        r'(Location="https://idp\.studycat\.local)(/idp/)',
        r'\1:4443\2',
        content
    )
    with open(path, 'w') as f:
        f.write(content)
    print(f"Fixed {path}")
PYEOF
docker compose --profile shibboleth build --no-cache idp sp
docker compose --profile shibboleth up -d idp sp
```

**Prevention:** Step 3g of the Detailed Setup already includes this fix. If you are starting from scratch, follow Step 3g in full and this issue should not occur.

### Issue 15: "Unable to locate metadata for identity provider"

**Symptom:** SP logs (`docker compose logs sp`) show:
```
WARN Shibboleth.SessionInitiator.SAML2 : unable to locate metadata for provider (https://idp.studycat.local/idp/shibboleth)
```
And clicking "Login with UTORid" returns HTTP 500 from the SP.

**Cause:** The `entityID` attribute in `idp-metadata.xml` does not match the entity ID the IdP is serving. The most common cause is accidentally modifying the `entityID` attribute when you meant to only change endpoint `Location` URLs. The `entityID` must exactly match `idp.entityID` in `shibboleth/idp/customized-shibboleth-idp/conf/idp.properties`.

**Diagnosis:**
```bash
# Check what entityID the metadata files declare
grep 'entityID=' shibboleth/sp/config/idp-metadata.xml | head -1
grep 'entityID=' shibboleth/idp/customized-shibboleth-idp/metadata/idp-metadata.xml | head -1

# Check what entityID the live IdP serves
curl -k -s https://idp.studycat.local:4443/idp/shibboleth | grep -o 'entityID="[^"]*"' | head -1

# Check what entityID is configured in idp.properties
grep "^idp.entityID" shibboleth/idp/customized-shibboleth-idp/conf/idp.properties
```
All four values must be identical.

**Fix:** Restore the `entityID` to `https://idp.studycat.local/idp/shibboleth` (no port) in both metadata files:
```bash
python3 << 'PYEOF'
import re
files = [
    'shibboleth/sp/config/idp-metadata.xml',
    'shibboleth/idp/customized-shibboleth-idp/metadata/idp-metadata.xml',
]
for path in files:
    with open(path) as f:
        content = f.read()
    # Remove :4443 only from the entityID attribute (not from Location URLs)
    content = re.sub(
        r'(entityID="https://idp\.studycat\.local):4443(/idp/shibboleth")',
        r'\1\2',
        content
    )
    with open(path, 'w') as f:
        f.write(content)
    print(f"Fixed {path}")
PYEOF
docker compose --profile shibboleth build --no-cache idp sp
docker compose --profile shibboleth up -d idp sp
```

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

> **Note:** The `customized-shibboleth-idp/` directory is gitignored. See Step 1 and Steps 3a–3g above for configuration instructions.

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
   - Use a managed SQL Server instance (e.g. Azure SQL Database, Amazon RDS for SQL Server)
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

**Last Updated:** February 26, 2026
**Version:** 2.4.0

> **Version 2.4 Changes:** Added Issues 14 and 15 to the Troubleshooting section covering the two runtime issues discovered during end-to-end testing: IdP login page returning 404 due to missing `:4443` port in SSO endpoint URLs (Issue 14), and SP failing to locate IdP metadata when the `entityID` attribute is accidentally changed alongside the endpoint URLs (Issue 15). Expanded Issue 9 to explain the init script's short-lived `validUntil` as a common cause.

> **Version 2.3 Changes:** Fixed one additional bug in Step 3g found during end-to-end login testing:
> 4. **Step 3g**: Added Python script to fix SSO/SLO endpoint `Location` URLs to include `:4443` (the IdP's HTTPS port). The init script generates metadata with port-less URLs (defaulting to 443), causing browsers to 404 on the IdP login page. The fix explicitly targets only `Location=` attributes to avoid corrupting the `entityID` attribute.

> **Version 2.2 Changes:** Fixed three bugs found during fresh-setup verification:
> 1. **Step 3b**: Replaced non-functional `sed` commands (which fail because the generated `ldap.properties` uses spaces around `=`) with a cross-format Python script.
> 2. **Step 3f**: Replaced the Python `replace()` script (which incorrectly inserted `StudyCATSP` before the root XML element) with a `cat > file` command that writes the correct file directly.
> 3. **Step 3g**: Added copy + `validUntil` fix for both `idp-metadata.xml` files—the init script generates metadata that expires within minutes, causing the SP to fail with "metadata instance was invalid".

> **Version 2.1 Changes:** Quick Start restructured into First-Time Setup and Starting the App sections. Removed FYI steps (Steps 4, 5, 6, 8 from v2.0) that described committed files requiring no action. Added inline `sed` and Python commands for all manual file edits. IdP configuration sub-steps renamed 3a–3g with a parent Step 3 heading.
