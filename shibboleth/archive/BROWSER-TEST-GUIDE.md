# 🌐 Browser Testing Guide - Shibboleth SSO

**Date**: January 27, 2026  
**Status**: Ready for Testing

---

## ✅ Pre-Test Checklist

Before starting browser testing, verify:

- [x] IdP container running (studycat_idp)
- [x] SP container running (studycat_sp)
- [x] `/etc/hosts` configured with:
  ```
  127.0.0.1  idp.studycat.local
  127.0.0.1  sp.studycat.local
  ```

---

## 🧪 Test 1: Basic SSO Flow

### Step 1: Access the Service Provider

Open your browser and navigate to:
```
https://sp.studycat.local/
```

**Expected Result**: 
- Browser will show SSL certificate warning (self-signed cert)
- Click "Advanced" → "Accept the Risk and Continue" (Firefox) or "Proceed to sp.studycat.local (unsafe)" (Chrome)

---

### Step 2: Redirect to IdP

**What Should Happen**:
1. Browser redirects to: `https://idp.studycat.local:4443/idp/profile/authn/Password`
2. You'll see another SSL warning for the IdP
3. Accept the certificate again
4. You should see the **Shibboleth IdP Login Page**

**If this doesn't happen**:
- Check browser console for errors
- Verify `/etc/hosts` entries are correct
- Ensure both containers are running

---

### Step 3: Login with Test User

**Test Credentials** (all use password: `password123`):

| Username     | Password     | Role       | Expected Affiliation      |
|-------------|--------------|------------|---------------------------|
| `student`   | `password123`| Student    | `member@studycat.local`, `student@studycat.local` |
| `instructor`| `password123`| Instructor | `member@studycat.local`, `student@studycat.local` |
| `admin`     | `password123`| Admin      | `member@studycat.local`, `student@studycat.local` |

**Action**:
1. Enter username: `student`
2. Enter password: `password123`
3. Click "Login"

**Expected Result**:
- IdP authenticates the user
- IdP generates SAML Response
- Browser redirects back to SP with SAML assertion

---

### Step 4: SP Processes Authentication

**What Should Happen**:
- SP receives SAML Response
- SP validates the assertion against IdP metadata
- SP creates a Shibboleth session
- SP sets session cookie
- SP proxies request to backend (would be Next.js app at localhost:3000)

**Expected Outcome**:
- You should be redirected to: `https://sp.studycat.local/`
- Since Next.js isn't connected yet, you'll see an error like:
  - `502 Bad Gateway` (Apache can't reach Next.js)
  - OR a proxy error message

**✅ This is EXPECTED and GOOD!**  
It means Shibboleth authentication succeeded, but the backend app isn't running yet.

---

## 🔍 Test 2: Verify Shibboleth Session

### Check Session Status

Navigate to:
```
https://sp.studycat.local/Shibboleth.sso/Session
```

**Expected Result**: XML output showing your active session:

```xml
<Session>
  <Applications>
    <Application id="default" entityID="https://sp.studycat.local/shibboleth">
      <AuthnInstant>2026-01-27T...</AuthnInstant>
      <Attributes>
        <Attribute name="eppn">
          <Value>student@studycat.local</Value>
        </Attribute>
        <Attribute name="mail">
          <Value>student@studycat.local</Value>
        </Attribute>
        <Attribute name="displayName">
          <Value>student</Value>
        </Attribute>
        <Attribute name="affiliation">
          <Value>member@studycat.local</Value>
          <Value>student@studycat.local</Value>
        </Attribute>
      </Attributes>
    </Application>
  </Applications>
</Session>
```

**Key Things to Verify**:
- ✅ Session exists
- ✅ Attributes are present (eppn, mail, displayName, affiliation)
- ✅ Values match the logged-in user
- ✅ Affiliation shows `member@studycat.local` and `student@studycat.local`

**If you see "No Session"**:
- Authentication may have failed
- Check IdP logs: `docker logs studycat_idp`
- Check SP logs: `docker logs studycat_sp`

---

## 🔍 Test 3: Test Different Users

### Test User 2: Instructor

1. **Logout first**:
   ```
   https://sp.studycat.local/Shibboleth.sso/Logout
   ```

2. **Login again with**:
   - Username: `instructor`
   - Password: `password123`

3. **Check session** at: `https://sp.studycat.local/Shibboleth.sso/Session`

4. **Verify** attributes show `instructor` as the principal

---

### Test User 3: Admin

Repeat the same process with:
- Username: `admin`
- Password: `password123`

---

## 🐛 Troubleshooting

### Issue 1: "Unable to contact the IdP"

**Symptoms**: Error message from SP saying it can't reach the IdP

**Solutions**:
1. Verify IdP is running:
   ```bash
   docker ps | grep studycat_idp
   ```

2. Check IdP is accessible:
   ```bash
   curl -k -I https://idp.studycat.local:4443/idp/shibboleth
   ```

3. Verify `/etc/hosts`:
   ```bash
   cat /etc/hosts | grep studycat
   ```

---

### Issue 2: "Invalid SAML Response"

**Symptoms**: Error after login, can't establish session

**Solutions**:
1. Check IdP logs for errors:
   ```bash
   docker logs studycat_idp | tail -50
   ```

2. Verify metadata exchange is complete:
   ```bash
   docker logs studycat_idp | grep "StudyCATSP"
   ```

3. Check SP logs:
   ```bash
   docker logs studycat_sp | grep -i error
   ```

---

### Issue 3: Login Page Doesn't Appear

**Symptoms**: Redirect to IdP fails or shows error

**Solutions**:
1. Verify IdP certificate is accessible:
   ```bash
   openssl s_client -connect idp.studycat.local:4443 </dev/null 2>/dev/null | grep "subject"
   ```

2. Check IdP is running:
   ```bash
   docker logs studycat_idp | tail -20
   ```

3. Test IdP directly:
   ```bash
   curl -k https://idp.studycat.local:4443/idp/profile/Status
   ```

---

### Issue 4: "502 Bad Gateway" After Login

**This is EXPECTED!**

The SP successfully authenticated you, but the Next.js application isn't running.

**To verify authentication worked**:
1. Check session: `https://sp.studycat.local/Shibboleth.sso/Session`
2. If you see your session with attributes → ✅ **SUCCESS!**

**Next step**: Start the Next.js application and configure it to accept Shibboleth headers

---

## 📊 What to Look For

### ✅ Success Indicators

- [ ] Can access SP URL without errors
- [ ] Redirect to IdP login page works
- [ ] Can login with test credentials
- [ ] Redirect back to SP after login
- [ ] Session endpoint shows active session
- [ ] Attributes are present in session (eppn, mail, affiliation)
- [ ] Can logout successfully
- [ ] Can login with different users

### ❌ Failure Indicators

- [ ] Cannot resolve hostnames (check `/etc/hosts`)
- [ ] SSL errors that won't accept (certificate issues)
- [ ] IdP login page doesn't load (IdP down or unreachable)
- [ ] Login fails with "Invalid credentials" (htpasswd issue)
- [ ] No session after login (SAML issue)
- [ ] Missing attributes in session (attribute resolver issue)

---

## 🧪 Advanced Testing

### Test Single Logout

1. Login with any user
2. Verify session exists
3. Visit: `https://sp.studycat.local/Shibboleth.sso/Logout`
4. Should redirect to IdP logout page
5. Session should be terminated
6. Verify: `https://sp.studycat.local/Shibboleth.sso/Session` shows "No Session"

---

### Check HTTP Headers (Advanced)

To see what headers are being passed to the backend application:

1. **Start Next.js app** (if not running):
   ```bash
   cd /Users/paartharya/Paarth\ Stuff/Courses/CSC494/Code/studycat
   pnpm dev
   ```

2. **Add a test route** to inspect headers:
   
   Create `app/api/test-headers/route.ts`:
   ```typescript
   export async function GET(request: Request) {
     const headers = Object.fromEntries(request.headers.entries());
     return Response.json({ headers }, { status: 200 });
   }
   ```

3. **Access through SP**:
   ```
   https://sp.studycat.local/api/test-headers
   ```

4. **Look for Shibboleth headers**:
   - `X-Remote-User` (should be `student@studycat.local`)
   - `X-Remote-Mail` (should be `student@studycat.local`)
   - `X-Remote-DisplayName` (should be `student`)
   - `X-Remote-Affiliation` (should be `member@studycat.local;student@studycat.local`)

---

## 📸 Screenshot Checklist

For documentation, capture screenshots of:
1. IdP login page
2. Successful login redirect
3. Session page showing attributes
4. Logout confirmation

---

## 🎯 Success Criteria

**Shibboleth SSO is fully working when**:
- ✅ All three test users can login
- ✅ Sessions are created with correct attributes
- ✅ Logout works properly
- ✅ No errors in IdP or SP logs
- ✅ Headers are passed to backend application

---

## 📝 Notes for Testing

- **Browser**: Use Firefox or Chrome (latest versions)
- **Private/Incognito Mode**: Recommended to avoid cached sessions
- **Developer Tools**: Keep browser console open (F12)
- **Multiple Users**: Test in different browser profiles or clear cookies between tests

---

## 🚀 After Successful Testing

Once browser testing confirms SSO is working:

1. **Document Results**: Update `TEST-RESULTS.md` with browser test outcomes
2. **Begin Application Integration**: Start Person 2 tasks
3. **Configure Next.js**: Read Shibboleth headers and create sessions
4. **Role Mapping**: Map affiliations to StudyCAT roles

---

**Ready to test?** Open your browser and navigate to `https://sp.studycat.local/`! 🎉
