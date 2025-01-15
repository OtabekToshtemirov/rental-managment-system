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
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: [true, 'Qism mahsulot tanlanishi shart']
                },
                quantity: {
                    type: Number,
                    required: [true, 'Qism mahsulot miqdori kiritilishi shart'],
                    min: [1, 'Qism mahsulot miqdori 1 dan kam bo\'lishi mumkin emas']
                },
                dailyRate: {
                    type: Number,
                    required: [true, 'Qism mahsulot narxi kiritilishi shart'],
                    min: [0, 'Qism mahsulot narxi 0 dan kam bo\'lishi mumkin emas']
                }
            }
        ],
        rented: {
            type: Number,
            default: 0,
        },
        rentalCount: {
            type: Number,
            default: 0,
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
)

productSchema.virtual('availability').get(function() {
    return this.quantity > 0 && this.isAvailable
})

productSchema.pre('save', function(next) {
    if (this.type === 'combo' && this.parts?.length > 0) {
        // Calculate total daily rate from parts
        this.dailyRate = this.parts.reduce((total, part) => {
            return total + (part.dailyRate * part.quantity)
        }, 0)
    }
    next()
})

module.exports = mongoose.model('Product', productSchema)