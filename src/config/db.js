const mongoose = require('mongoose')
const { DB_URI } = require('./environments')

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/rental-managment-system')
    console.log('Successfully connect DB')
  } catch (error) {
    console.log(error)
  }
}

module.exports = connectDB
