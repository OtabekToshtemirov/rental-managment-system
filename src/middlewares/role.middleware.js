const BaseError = require('../utils/error')

const roleMiddleware = async (req, res, next) => {
  try {
    const { role } = req.user

    if (role === 'user') {
      throw new BaseError('You are not admin!', 400)
    }

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = roleMiddleware
