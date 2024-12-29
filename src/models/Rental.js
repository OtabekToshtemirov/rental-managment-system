const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    amount: {
        type: Number,
        required: true
    },
    paymentType: {
        type: String,
        enum: ['cash', 'card', 'transfer'],
        required: true
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    description: String
});

const borrowedProductSchema = new Schema({
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product", 
        required: true 
    },
    quantity: { 
        type: Number, 
        required: true,
        min: [1, 'Miqdor 1 dan kam bo\'lmasligi kerak']
    },
    dailyRate: {
        type: Number,
        required: true,
        min: [0, 'Kunlik narx 0 dan kam bo\'lmasligi kerak']
    },
    startDate: { 
        type: Date, 
        required: true 
    },
    rentDate: { 
        type: Date, 
        required: true 
    },
    endDate: { 
        type: Date 
    }
});

const returnedProductSchema = new Schema({
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product", 
        required: true 
    },
    quantity: { 
        type: Number, 
        required: true,
        min: [1, 'Miqdor 1 dan kam bo\'lmasligi kerak']
    },
    startDate: { 
        type: Date, 
        required: true 
    },
    returnDate: { 
        type: Date, 
        required: true 
    },
    cost: { 
        type: Number,
        required: true,
        min: [0, 'Narx 0 dan kam bo\'lmasligi kerak']
    }
});

const rentalSchema = new mongoose.Schema(
    {
        rentalNumber: {
            type: String,
            required: true,
            unique: true
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: [true, 'Mijoz tanlanishi shart']
        },
        car: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Car"
        },
        borrowedProducts: {
            type: [borrowedProductSchema],
            validate: {
                validator: function(products) {
                    return products.length > 0;
                },
                message: 'Kamida bitta mahsulot tanlash kerak'
            }
        },
        returnedProducts: {
            type: [returnedProductSchema],
            default: []
        },
        workStartDate: {
            type: Date,
            required: [true, 'Ish boshlanish sanasi kiritilishi shart']
        },
        endDate: {
            type: Date
        },
        payments: {
            type: [paymentSchema],
            default: []
        },
        totalCost: { 
            type: Number,
            required: [true, 'Umumiy summa kiritilishi shart'],
            min: [0, 'Umumiy summa 0 dan kam bo\'lmasligi kerak']
        },
        debt: { 
            type: Number,
            required: true,
            default: 0,
            min: [0, 'Qarz 0 dan kam bo\'lmasligi kerak']
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'cancelled'],
            default: 'active',
            required: true
        }
    },
    { 
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

module.exports = mongoose.model("Rental", rentalSchema);
