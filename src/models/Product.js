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
        type: {
            type: String,
            enum: ['single', 'combo'],
            required: true,
        },
        parts: [
            {
                product: {
                    type: String,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                }
            }
        ],
        quantity: {
            type: Number,
            default: 1,
        },
        rentalCount: {
            type: Number,
            default: 0,
        }
    },
    {timestamps: true}
)

module.exports = mongoose.model('Product', productSchema)