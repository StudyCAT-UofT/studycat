// for dev purposes, we keep the ability to switch between simple auth and shibboleth
export type AuthMode = 'simple' | 'shibboleth';

export const authConfig = {
  mode: (process.env.AUTH_MODE || 'simple') as AuthMode,
  
  shibboleth: {
    spUrl: process.env.SHIBBOLETH_SP_URL || 'https://sp.studycat.local',
    loginUrl: process.env.SHIBBOLETH_LOGIN_URL || 'https://sp.studycat.local/Shibboleth.sso/Login',
    logoutUrl: process.env.SHIBBOLETH_LOGOUT_URL || 'https://sp.studycat.local/Shibboleth.sso/Logout',
  },
} as const;

export const isShibbolethMode = () => authConfig.mode === 'shibboleth';
export const isSimpleMode = () => authConfig.mode === 'simple';