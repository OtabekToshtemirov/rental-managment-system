require('dotenv').config()

module.exports = {
  HOST: process.env.HOST,
  PORT: process.env.PORT,
  DB_URI: process.env.DB_URI,
  HASH_SALT: process.env.HASH_SALT,
  ACCESS_TOKEN_KEY: process.env.ACCESS_TOKEN_KEY,
  ACCESS_TOKEN_TIME: process.env.ACCESS_TOKEN_TIME,
  REFRESH_TOKEN_KEY: process.env.REFRESH_TOKEN_KEY,
  REFRESH_TOKEN_TIME: process.env.REFRESH_TOKEN_TIME,
}