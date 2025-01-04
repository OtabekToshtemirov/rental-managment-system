const mongoose = require('mongoose')

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Mahsulot nomi kiritilishi shart'],
            trim: true
        },
        description: {
            type: String
        },
        category: {
            type: String,
            required: [true, 'Mahsulot kategoriyasi kiritilishi shart']
        },
        quantity: {
            type: Number,
            required: [true, 'Mahsulot miqdori kiritilishi shart'],
            min: [0, 'Mahsulot miqdori 0 dan kam bo\'lishi mumkin emas']
        },
        dailyRate: {
            type: Number,
            required: [true, 'Kunlik ijara narxi kiritilishi shart'],
            min: [0, 'Kunlik ijara narxi 0 dan kam bo\'lishi mumkin emas']
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        type: {
            type: String,
            required: [true, 'Mahsulot turi kiritilishi shart'],
            enum: {
                values: ['single', 'combo'],
                message: 'Mahsulot turi single yoki combo bo\'lishi kerak'
            }
        },
        parts: [
            {
                product: {
                    type: String,
                    required: [true, 'Qism mahsulot nomi kiritilishi shart']
                },
                quantity: {
                    type: Number,
                    required: [true, 'Qism mahsulot miqdori kiritilishi shart'],
                    min: [1, 'Qism mahsulot miqdori 1 dan kam bo\'lishi mumkin emas']
                }
            }
        ],
        rentalCount: {
            type: Number,
            default: 0,
        }
    },
    {timestamps: true}
)

module.exports = mongoose.model('Product', productSchema)