require('dotenv').config({ path: '.env' })

module.exports = {
    HOST: process.env.HOST || 'localhost',
    PORT: process.env.PORT || 5000,
    DB_URI: process.env.MONGODB_URL,
    HASH_SALT: process.env.HASH_SALT || 10,
    ACCESS_TOKEN_KEY: process.env.ACCESS_TOKEN_KEY,
    ACCESS_TOKEN_TIME: process.env.ACCESS_TOKEN_TIME,
    REFRESH_TOKEN_KEY: process.env.REFRESH_TOKEN_KEY,
    REFRESH_TOKEN_TIME: process.env.REFRESH_TOKEN_TIME,
    AUTH: {
        username: process.env.AUTH_USERNAME,
        password: process.env.AUTH_PASSWORD,
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN
    }
}