const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
    carNumber: {
        type: String,
        required: [true, 'Mashina raqami kiritilishi shart'],
        unique: true,
        trim: true
    },
    driverName: {
        type: String,
        required: [true, 'Haydovchi ismi kiritilishi shart'],
        trim: true
    },
    driverPhone: {
        type: String,
        required: true
    },
    rentalCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Car', carSchema);
