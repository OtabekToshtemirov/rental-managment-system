const mongoose = require('mongoose')

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        address: {
            type: String,
        },
        status: {
            type: String,
            enum: ['VIP', 'oddiy', 'bad'],
            default: 'oddiy'
        },
        balance: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    {timestamps: true}
)

module.exports = mongoose.model('Customer', customerSchema)
