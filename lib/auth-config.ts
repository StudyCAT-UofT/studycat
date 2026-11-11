// for dev purposes, we keep the ability to switch between simple auth and shibboleth
export type AuthMode = 'simple' | 'shibboleth';

export const authConfig = {
  mode: (process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE || 'simple') as AuthMode,

  // The Shibboleth SP (Apache + mod_shib) fronts the app on the same host, so its
  // handler is reached by a relative path. This works on any hostname without
  // configuration, which matters because these values are used in browser code,
  // where only build-time NEXT_PUBLIC_* environment variables are available.
  shibboleth: {
    loginUrl: '/Shibboleth.sso/Login',
    logoutUrl: '/Shibboleth.sso/Logout',
    callbackPath: '/api/auth/shibboleth/callback',
  },
} as const;

export const isShibbolethMode = () => authConfig.mode === 'shibboleth';
export const isSimpleMode = () => authConfig.mode === 'simple';
