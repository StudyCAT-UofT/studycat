# 🌐 Browser Testing Guide - FIXED VERSION

**Status**: ✅ Redirect loop fixed!  
**Date**: January 27, 2026

---

## ✅ What Was Fixed

The SP was protecting ALL paths including `/Shibboleth.sso`, creating an infinite redirect loop. 

**Fixed by**:
- Excluding `/Shibboleth.sso` from authentication
- Using lazy sessions (`requireSession 0`) on root path
- Allowing unauthenticated access to the application

---

## 🧪 Test 1: Verify No Redirect Loop

### Step 1: Access SP Homepage

Open your browser and go to:
```
https://sp.studycat.local/
```

**Expected Result**: 
- ✅ You should see **"503 Service Unavailable"** error
- ❌ You should **NOT** see "too many redirects"

**Why 503 is Good**:
The 503 error means:
- ✅ Shibboleth is working correctly
- ✅ Apache is trying to proxy to Next.js
- ❌ Next.js isn't running (which is expected)

---

## 🧪 Test 2: Trigger Shibboleth Login

Since the root path (`/`) doesn't require authentication anymore, we need to explicitly initiate SSO.

### Option A: Use the Shibboleth Login Endpoint

Navigate to:
```
https://sp.studycat.local/Shibboleth.sso/Login
```

**Expected Flow**:
1. Browser redirects to IdP login page
2. You'll see certificate warning for IdP (accept it)
3. IdP login form appears

**Test Credentials**:
- Username: `student`
- Password: `password123`

---

### Option B: Create a Protected Test Route

If you want to protect specific routes later, you can modify the Apache config to require auth on certain paths.

For example, to protect `/app/*` routes:
```apache
<LocationMatch "^/app">
    AuthType shibboleth
    ShibRequestSetting requireSession 1
    Require valid-user
    ShibUseHeaders On
</LocationMatch>
```

---

## 🧪 Test 3: Check Shibboleth Session

After logging in via `/Shibboleth.sso/Login`, check your session:

Navigate to:
```
https://sp.studycat.local/Shibboleth.sso/Session
```

**Expected Result**: XML output showing:
```xml
<Session>
  <Applications>
    <Application id="default" entityID="https://sp.studycat.local/shibboleth">
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

---

## 🧪 Test 4: Start Next.js and Test Full Flow

### Step 1: Start the Next.js Application

In a new terminal:
```bash
cd "/Users/paartharya/Paarth Stuff/Courses/CSC494/Code/studycat"
pnpm dev
```

This will start Next.js on `localhost:3000`.

### Step 2: Access Through SP

Now visit:
```
https://sp.studycat.local/
```

**Expected Result**:
- ✅ You should see the StudyCAT homepage
- ✅ No more 503 error!

### Step 3: Login via Shibboleth

Go to:
```
https://sp.studycat.local/Shibboleth.sso/Login
```

Login with `student` / `password123`.

### Step 4: Check if Headers Are Passed

The SP should now pass Shibboleth attributes as HTTP headers to your Next.js app.

**Create a test route** to verify headers are being passed:

Create `app/api/test-shibboleth-headers/route.ts`:
```typescript
export async function GET(request: Request) {
  const headers = {
    'X-Remote-User': request.headers.get('X-Remote-User'),
    'X-Remote-Eppn': request.headers.get('X-Remote-Eppn'),
    'X-Remote-Mail': request.headers.get('X-Remote-Mail'),
    'X-Remote-DisplayName': request.headers.get('X-Remote-DisplayName'),
    'X-Remote-Affiliation': request.headers.get('X-Remote-Affiliation'),
  };
  
  return Response.json({ 
    message: 'Shibboleth Headers',
    headers,
    authenticated: headers['X-Remote-User'] ? true : false
  }, { status: 200 });
}
```

Then visit:
```
https://sp.studycat.local/api/test-shibboleth-headers
```

**If logged in via Shibboleth**, you should see:
```json
{
  "message": "Shibboleth Headers",
  "headers": {
    "X-Remote-User": "student",
    "X-Remote-Eppn": "student@studycat.local",
    "X-Remote-Mail": "student@studycat.local",
    "X-Remote-DisplayName": "student",
    "X-Remote-Affiliation": "member@studycat.local;student@studycat.local"
  },
  "authenticated": true
}
```

---

## 🎯 Current Configuration Behavior

With the current ("lazy session") configuration:

- **Unauthenticated users**: Can access all routes
- **Shibboleth attributes**: Not available (all headers will be null)
- **To login**: User must explicitly go to `/Shibboleth.sso/Login`
- **After login**: All routes receive Shibboleth headers

### Why Use Lazy Sessions?

1. **Avoids redirect loop**: Doesn't force authentication on every request
2. **Flexible**: Application can decide when to require auth
3. **SSO-friendly**: If user has IdP session, attributes are passed automatically
4. **Graceful fallback**: Works even if user isn't authenticated

### To Require Authentication on Specific Routes

Add this to Apache config:
```apache
<LocationMatch "^/(quizzes|question-bank|students|analytics|upload)">
    AuthType shibboleth
    ShibRequestSetting requireSession 1
    Require valid-user
    ShibUseHeaders On
</LocationMatch>
```

This will require authentication only on those specific paths.

---

## 🐛 Troubleshooting

### Issue: Still getting "too many redirects"

**Solution**: Clear your browser cookies and cache, then try again.

### Issue: Session shows "No Session"

**Solution**: You haven't logged in yet. Go to `/Shibboleth.sso/Login` first.

### Issue: Headers are all null

**Reasons**:
1. You haven't logged in via Shibboleth
2. Session has expired
3. Apache `headers` module isn't enabled

---

## 📊 Success Checklist

- [ ] No redirect loop when accessing `https://sp.studycat.local/`
- [ ] Can manually trigger login via `/Shibboleth.sso/Login`
- [ ] IdP login page appears
- [ ] Can login with test credentials
- [ ] Session endpoint shows attributes
- [ ] Next.js app accessible through SP
- [ ] Headers are passed to backend

---

## 🚀 Next Steps

Once all tests pass:

1. **Persist the Configuration**: Update the SP Dockerfile or docker-compose to use this fixed configuration
2. **Implement Application Auth**: Update Next.js to read Shibboleth headers
3. **Create JWT Flow**: Issue JWT tokens based on Shibboleth attributes
4. **Role Mapping**: Map affiliations to StudyCAT roles
5. **Protect Routes**: Add authentication requirements to specific paths

---

**Ready to test?** Start with Test 1 above! 🎉
