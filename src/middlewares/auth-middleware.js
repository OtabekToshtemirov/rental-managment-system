const jwt = require('../services/jwt')
const Customers = require('../models/Customer')
const BaseError = require('../utils/error')

const authMiddleware = async (req, res, next) => {
  try {
    const { authorization } = req.headers

    if (!authorization || !authorization.startsWith('Bearer')) {
      throw new BaseError('Unauthorized', 401)
    }

    const token = authorization.split(' ')[1]

    if (!token) {
      throw new BaseError('Unauthorized', 401)
    }

    const decodedData = await jwt.verifyRefresh(token)

    if (!decodedData) {
      throw new BaseError('Unauthorized', 401)
    }

    const customer = await Customers.findById(decodedData.id)

    if (!customer) {
      throw new BaseError('Unauthorized', 401)
    }

    req.customer = customer
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = authMiddleware
