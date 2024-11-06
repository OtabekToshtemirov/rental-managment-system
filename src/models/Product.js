const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    dailyRate: {
      type: Number,
      required: true,
    },
    availability: {
      type: Boolean,
      default: true,
    },
    quantity: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Product', productSchema)
