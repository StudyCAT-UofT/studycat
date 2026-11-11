// for dev purposes, we keep the ability to switch between simple auth and shibboleth
export type AuthMode = 'simple' | 'shibboleth';

function spBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SHIBBOLETH_SP_URL || '').replace(/\/+$/, '');
}

export const authConfig = {
  mode: (process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE || 'simple') as AuthMode,

  // By default the Shibboleth SP (Apache + mod_shib) fronts the app on the same host,
  // so its handler is reached by a relative path, which works on any hostname.
  // NEXT_PUBLIC_SHIBBOLETH_SP_URL is only needed when the browser reaches the app
  // without going through the SP (e.g. the dev server at http://localhost:3001).
  // These values are used in browser code, where only NEXT_PUBLIC_* variables exist,
  // and those are inlined when the app is built (or when `next dev` starts).
  shibboleth: {
    loginUrl: `${spBaseUrl()}/Shibboleth.sso/Login`,
    logoutUrl: `${spBaseUrl()}/Shibboleth.sso/Logout`,
    callbackPath: '/api/auth/shibboleth/callback',
  },
} as const;

export const isShibbolethMode = () => authConfig.mode === 'shibboleth';
export const isSimpleMode = () => authConfig.mode === 'simple';
