require('dotenv').config();

const oauthConfig = {
    clientId: process.env.OAUTH_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_CLIENT_SECRET || '',
    redirectUri: process.env.OAUTH_REDIRECT_URI || 'https://localhost:3000/auth/callback',
    authEndpoint: 'https://../oauth2/authorize',
    tokenEndpoint: 'https://../oauth2/token',
    userInfoEndpoint: 'https://.../oauth2/userinfo',
    scope: 'profile email'
}

module.exports = oauthConfig;