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

Edit `/etc/hosts` (requires sudo):

```bash
sudo nano /etc/hosts
```

Add these lines:

```
127.0.0.1   idp.studycat.local
127.0.0.1   sp.studycat.local
```

### 2. Start All Services

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

## 🔐 Shibboleth Security Setup
Since security certificates (.pem files) are unique to each environment and are excluded from Git, every developer must generate their own local keys and register them with the Identity Provider (IdP).

### Run the Generation Script
We provide a script to automate the folder creation and key generation. Run this from the project root:

```
mkdir shibboleth/sp/certificates

# Ensure the script is executable
chmod +x generate-shib-certs.sh

# Run the script
./generate-shib-certs.sh
```

What to do during the prompt: The script will trigger an interactive OpenSSL session.

You can safely hit Enter to skip most fields.

Important: When it asks for Common Name (CN), type sp.studycat.local.

### Update the Identity Provider (IdP)
The IdP cannot talk to your local machine until it has your new Public Certificate.

Open shibboleth/sp/certificates/sp-cert.pem in your editor.

Copy the long string of text between the -----BEGIN CERTIFICATE----- and -----END CERTIFICATE----- lines.

On your IdP server (or local IdP container), open the metadata file: shibboleth-idp/metadata/sp-metadata.xml

Find the <ds:X509Certificate> tag and replace its contents with the string you copied.

Restart the IdP (e.g., restart the Jetty or Docker container) to refresh the metadata.

### Restart the Service Provider
Finally, restart your Shibboleth SP container to load the new keys:

```
docker-compose restart sp
```

### ⚠️ Troubleshooting: "Unable to resolve any key decryption keys"
If you see this error in your browser after authenticating:

Mismatch: Your local sp-key.pem does not match the sp-cert.pem you gave to the IdP. This happens if you ran the script twice but only updated the IdP once.

Permissions: Ensure sp-key.pem is not world-readable (chmod 600).

Paths: Double-check that the paths in shibboleth2.xml are absolute and correct.

### 3. Test the Setup

1. Open browser: `https://sp.studycat.local/`
2. Click "Login"
3. Click "Login with UTORid"
4. Enter credentials:
   - **Username**: `student`
   - **Password**: `password123`
5. You should be logged in!

---

## Detailed Setup

### Step 1: Initialize IdP Configuration

The IdP configuration is already included in the repository at `shibboleth/idp/customized-shibboleth-idp/`. If you need to regenerate it:

```bash
cd shibboleth/idp

# Initialize IdP (only needed once)
docker run -it -v "$(pwd)":/ext-mount --rm unicon/shibboleth-idp init-idp.sh
```

**What this does:**
- Generates IdP configuration in `customized-shibboleth-idp/`
- Creates cryptographic keys and certificates
- Sets up default configuration files

### Step 2: Generate TLS Certificates

The IdP needs TLS certificates for browser and backchannel communication.

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

The IdP properties are already configured in `shibboleth/idp/customized-shibboleth-idp/conf/idp.properties`:

```properties
# Core settings
idp.entityID=https://idp.studycat.local/idp/shibboleth
idp.scope=studycat.local
idp.sealer.storePassword=abc123
idp.sealer.keyPassword=abc123

# Authentication
idp.authn.flows=Password

# LDAP connection
idp.authn.LDAP.ldapURL=ldap://ldap:389
idp.authn.LDAP.baseDN=ou=people,dc=studycat,dc=local
idp.authn.LDAP.userFilter=(uid={user})
idp.authn.LDAP.bindDN=cn=admin,dc=studycat,dc=local
idp.authn.LDAP.bindDNCredential=admin123
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
```

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
      - "443:443"
      - "9443:9443"
    environment:
      HOSTNAME: "sp.studycat.local"
      SERVICE_TO_PROTECT: "host.docker.internal"
      SERVICE_PORT: "3000"
      IDP_ENTITY_ID: "https://idp.studycat.local/idp/shibboleth"
      IDP_METADATA_URL: "https://idp.studycat.local:4443/idp/shibboleth"
      SHIB_DOWNLOAD_METADATA: "false"
    volumes:
      - ./shibboleth/sp/config/idp-metadata.xml:/etc/shibboleth/metadata/idp-metadata.xml:ro
      - ./shibboleth/sp/config/shibboleth2.xml:/etc/shibboleth/shibboleth2.xml:ro
      - ./shibboleth/sp/config/attribute-map.xml:/etc/shibboleth/attribute-map.xml:ro
      - ./shibboleth/sp/config/apache-studycat.conf:/etc/apache2/sites-enabled/studycat.conf:ro
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

You should see:
```
Attributes:
- eppn: student@studycat.local
- mail: student@studycat.local
- displayName: student
- affiliation: member@studycat.local;student@studycat.local
- uid: student
```

---

## Troubleshooting

### Issue 1: "Too Many Redirects"

**Symptom:** Browser shows "This page isn't working - too many redirects"

**Cause:** Apache configuration issue with Shibboleth handlers

**Fix:**
1. Check `apache-studycat.conf` has `ProxyPass /Shibboleth.sso !`
2. Restart SP: `docker compose restart sp`

### Issue 2: "Access Denied" After Login

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

### Issue 7: Port Already in Use

**Symptom:** `docker compose up` fails with "port is already allocated"

**Fix:**
```bash
# Find what's using the port
lsof -i :443
lsof -i :4443

# Kill the process or change Docker port mappings
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

### Role Mapping

The application maps Shibboleth attributes to internal user roles (`student`, `instructor`, `admin`) based on the `scoped-affiliation` or `affiliation` attribute.

**Mapping Logic:**
1. **Admin**: If affiliation contains `employee` or `admin`.
2. **Instructor**: If affiliation contains `faculty`, `staff`, or `instructor`.
3. **Student**: Default role if no other matches found (or explicitly `student`).

This logic is implemented in `app/api/auth/shibboleth/callback/route.ts`.

### Key Files

**IdP:**
- `shibboleth/idp/customized-shibboleth-idp/conf/idp.properties` - Core IdP settings
- `shibboleth/idp/customized-shibboleth-idp/conf/ldap.properties` - LDAP connection
- `shibboleth/idp/customized-shibboleth-idp/conf/attribute-resolver.xml` - Define user attributes
- `shibboleth/idp/customized-shibboleth-idp/conf/attribute-filter.xml` - Control attribute release
- `shibboleth/idp/customized-shibboleth-idp/conf/relying-party.xml` - SP trust configuration

**SP:**
- `shibboleth/sp/config/shibboleth2.xml` - SP configuration
- `shibboleth/sp/config/attribute-map.xml` - SAML attribute → HTTP header mapping
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

**Last Updated:** January 27, 2026  
**Version:** 1.0.0
