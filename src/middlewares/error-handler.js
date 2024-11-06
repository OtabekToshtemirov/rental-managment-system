const BaseError = require('../utils/error')

module.exports = (err, req, res, next) => {
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal Server Error'

  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({ message: err.message })
  }

  console.error(err)
  return res.status(statusCode).json({
    status: 'error',
    message,
  })
}
