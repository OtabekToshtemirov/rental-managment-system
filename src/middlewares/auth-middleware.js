const jwt = require('../services/jwt-services')
const Employees = require('../models/Employees')
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

    const data = await Employees.findOne({ _id: decodedData.id })

    if (!data) {
      throw new BaseError('Employee not found', 404)
    }

    req.user = data

    next()
  } catch (error) {
    next(error)
  }
}

module.exports = authMiddleware
