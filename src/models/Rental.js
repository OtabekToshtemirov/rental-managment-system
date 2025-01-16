const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const partSchema = new Schema({
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product", 
        required: true 
    },
    quantity: { 
        type: Number, 
        required: true,
        min: [0, 'Miqdor 0 dan kam bo\'lmasligi kerak']
    },
    dailyRate: {
        type: Number,
        default: 0
    }
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
    },
    parts: [partSchema]
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
    days: {
        type: Number,
        required: true,
        min: [1, 'Kunlar soni 1 dan kam bo\'lmasligi kerak']
    },
    dailyRate: {
        type: Number,
        required: true,
        min: [0, 'Kunlik narx 0 dan kam bo\'lmasligi kerak']
    },
    totalCost: {
        type: Number,
        required: true,
        min: [0, 'Umumiy summa 0 dan kam bo\'lmasligi kerak']
    },
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Chegirma 0 dan kam bo\'lmasligi kerak']
    },
    parts: [partSchema]
});

const rentalSchema = new Schema({
    rentalNumber: {
        type: String,
        required: [true, 'Ijara raqami kiritilishi shart'],
        unique: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Mijoz kiritilishi shart']
    },
    car: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Car"
    },
    borrowedProducts: {
        type: [borrowedProductSchema],
        required: true,
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
    totalCost: { 
        type: Number,
        required: [true, 'Umumiy summa kiritilishi shart'],
        min: [0, 'Umumiy summa 0 dan kam bo\'lmasligi kerak']
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: [0, 'To\'langan summa 0 dan kam bo\'lmasligi kerak']
    },
    totalDiscount: {
        type: Number,
        default: 0,
        min: [0, 'Umumiy chegirma 0 dan kam bo\'lmasligi kerak']
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
    },
    payments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    }],
    description: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Rental', rentalSchema);