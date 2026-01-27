# Task 2: IdP User Authentication - COMPLETED ✅

## Test Users Created

Three test users have been created with htpasswd authentication:

| Username   | Password     | Role        | Email                      | Affiliation |
|------------|--------------|-------------|----------------------------|-------------|
| student    | password123  | Student     | student@studycat.local     | student     |
| instructor | password123  | Instructor  | instructor@studycat.local  | faculty     |
| admin      | password123  | Admin       | admin@studycat.local       | staff       |

## Configuration Files Modified/Created

### 1. `/credentials/htpasswd`
- Contains hashed passwords for the three test users
- Used by HTPasswdCredentialValidator for authentication

### 2. `/conf/authn/password-authn-config.xml`
- Configures IdP to use htpasswd file for password validation
- Points to: `%{idp.home}/credentials/htpasswd`

### 3. `/conf/attribute-resolver.xml`
- **eduPersonPrincipalName (eppn)**: username@studycat.local
- **uid**: username from login
- **mail**: username@studycat.local
- **displayName**: username (can be customized later)
- **eduPersonScopedAffiliation**: mapped by username:
  - student → student@studycat.local
  - instructor → faculty@studycat.local
  - admin → staff@studycat.local
- **eduPersonAffiliation**: unscoped version (student, faculty, staff)

### 4. `/conf/attribute-filter.xml`
- Simplified for development: releases ALL attributes to ANY Service Provider
- ⚠️ WARNING: Not suitable for production (would need SP-specific policies)

## Password Authentication Flow

Password authentication is enabled in `idp.properties`:
```
idp.authn.flows=Password
```

## How It Works

1. User visits SP and clicks login
2. SP redirects to IdP login page
3. User enters username and password
4. IdP validates credentials against htpasswd file
5. IdP retrieves user attributes via attribute resolver (including affiliation mapping)
6. IdP releases attributes to SP via attribute filter
7. SP receives SAML assertion with user attributes
8. SP passes attributes as HTTP headers to StudyCAT application

## Attribute Mapping for StudyCAT

The application will receive these headers from the SP:

- `X-Remote-User` → uid (username)
- `X-Remote-Email` → mail (email address)
- `X-Remote-DisplayName` → displayName
- `X-Remote-Affiliation` → eduPersonAffiliation (student/faculty/staff)

The application backend will map affiliation to StudyCAT roles:
- `student` → student role
- `faculty` → instructor role  
- `staff` → admin role

## Next Steps

Task 3 will involve testing this configuration by:
1. Creating a Docker image from this configuration
2. Running the IdP container
3. Verifying the login page is accessible
4. Testing authentication with the test users
