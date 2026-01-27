# StudyCAT Shibboleth SSO - Quick Start Guide

## 🚀 Starting the Shibboleth Stack

### Prerequisites

1. Docker images built:
   ```bash
   # Check if images exist
   docker images | grep studycat
   ```

   Should show:
   ```
   studycat-idp    latest    ...
   studycat-sp     latest    ...
   ```

2. `/etc/hosts` configured:
   ```bash
   grep studycat /etc/hosts
   ```

   Should show:
   ```
   127.0.0.1 idp.studycat.local sp.studycat.local
   ```

### Start Everything

```bash
# From project root
cd "/Users/paartharya/Paarth Stuff/Courses/CSC494/Code/studycat"

# Start database (if not running)
docker compose up -d db

# Start IdP and SP
docker compose --profile shibboleth up -d

# Check all services are running
docker compose ps
```

You should see:
```
studycat_db    postgres:16-alpine   Up      5432/tcp
studycat_idp   studycat-idp:latest  Up      4443/tcp, 8443/tcp
studycat_sp    studycat-sp:latest   Up      80/tcp, 443/tcp
```

### Verify Services

```bash
# Check IdP
curl -k https://idp.studycat.local:4443/idp/shibboleth | head -5

# Check SP
curl -k https://sp.studycat.local/Shibboleth.sso/Metadata | head -5

# Check logs
docker compose logs -f sp
docker compose logs -f idp
```

### Test Login Flow (After Next.js App Integration)

1. Visit protected route: `https://sp.studycat.local/quizzes`
2. Should redirect to IdP: `https://idp.studycat.local:4443/idp/profile/SAML2/Redirect/SSO`
3. Login with test user:
   - Username: `student`
   - Password: `password123`
4. Should redirect back to SP with session
5. Headers passed to Next.js app:
   ```
   X-Remote-User: student
   X-Remote-Mail: student@studycat.local
   X-Remote-Affiliation: member;student
   ```

---

## 🛑 Stopping Everything

```bash
# Stop Shibboleth services
docker compose --profile shibboleth down

# Stop everything including database
docker compose down
```

---

## 🔄 Rebuilding Images

### Rebuild IdP

```bash
cd shibboleth/idp
docker build -t studycat-idp:latest .
```

### Rebuild SP

```bash
cd shibboleth/sp
docker build -t studycat-sp:latest .
```

### Restart After Rebuild

```bash
cd ../..  # Back to project root
docker compose --profile shibboleth down
docker compose --profile shibboleth up -d
```

---

## 🐛 Troubleshooting

### IdP Not Starting

```bash
# Check logs
docker logs studycat_idp

# Common issues:
# - Certificate password mismatch
# - Port already in use (4443 or 8443)
```

### SP Not Starting

```bash
# Check logs
docker logs studycat_sp

# Common issues:
# - Can't download IdP metadata
# - Port already in use (80 or 443)
# - host.docker.internal not reachable
```

### Can't Access Services

```bash
# Check /etc/hosts
grep studycat /etc/hosts

# Should have:
127.0.0.1 idp.studycat.local sp.studycat.local

# Check containers are running
docker ps | grep studycat

# Check ports
docker port studycat_sp
docker port studycat_idp
```

### Metadata Issues

```bash
# Re-download IdP metadata
curl -k https://idp.studycat.local:4443/idp/shibboleth \
  > shibboleth/sp/config/idp-metadata.xml

# Rebuild SP with updated metadata
cd shibboleth/sp
docker build -t studycat-sp:latest .

# Restart
cd ../..
docker compose --profile shibboleth up -d --force-recreate sp
```

---

## 📝 Test Users

| Username   | Password     | Email                      | Role        |
|------------|--------------|----------------------------|-------------|
| student    | password123  | student@studycat.local     | Student     |
| instructor | password123  | instructor@studycat.local  | Instructor  |
| admin      | password123  | admin@studycat.local       | Admin       |

---

## 🔗 Important URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **IdP Metadata** | https://idp.studycat.local:4443/idp/shibboleth | IdP SAML configuration |
| **IdP Login** | https://idp.studycat.local:4443/idp/profile/SAML2/Redirect/SSO | Direct login (usually via SP redirect) |
| **SP Metadata** | https://sp.studycat.local/Shibboleth.sso/Metadata | SP SAML configuration |
| **SP Login** | https://sp.studycat.local/Shibboleth.sso/Login | Initiate SSO login |
| **SP Status** | https://sp.studycat.local/Shibboleth.sso/Status | SP status (protected) |
| **SP Session** | https://sp.studycat.local/Shibboleth.sso/Session | View current session |
| **StudyCAT (via SP)** | https://sp.studycat.local | Main app access |
| **StudyCAT (direct)** | http://localhost:3000 | Direct access (no SSO) |

---

## 📊 Port Reference

| Port | Service | Purpose |
|------|---------|---------|
| 80 | SP | HTTP (redirects to 443) |
| 443 | SP | HTTPS (main access) |
| 4443 | IdP | Browser TLS |
| 8443 | IdP | Backchannel TLS |
| 5432 | PostgreSQL | Database |
| 3000 | Next.js | StudyCAT app |

---

## 📚 Documentation

- **Setup Progress**: `shibboleth/SETUP-PROGRESS.md` - Overall progress tracker
- **IdP Setup**: `shibboleth/idp/README.md` - IdP documentation
- **SP Setup**: `shibboleth/sp/TASK4-UPDATED.md` - SP documentation
- **SP Guide**: `shibboleth/SP-SETUP-GUIDE.md` - Detailed SP guide

---

## ✅ Current Status

- ✅ IdP: Built and tested
- ✅ SP: Built and tested  
- ✅ Docker Compose: Updated
- ⏳ Metadata Exchange: Task 5
- ⏳ App Integration: Person 2

---

**Quick Start Complete! Ready to test SSO flow once Next.js app integration is complete.**
