const mongoose = require('mongoose');

const carSchema = new mongoose.Schema({
    carNumber: {
        type: String,
        required: [true, 'Машина рақами киритилиши шарт'],
        unique: true,
        trim: true
    },
    driverName: {
        type: String,
        required: [true, 'Ҳайдовчи исми киритилиши шарт'],
        trim: true
    },
    driverPhone: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'repair', 'banned'],
        default: 'active'
    },
    description: {
        type: String,
        trim: true
    },
    rentalCount: {
        type: Number,
        default: 0
    },
    rentals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rental'
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Car', carSchema);
