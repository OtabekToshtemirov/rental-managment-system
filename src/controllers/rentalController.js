const express = require('express');
const Rental = require('../models/Rental');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Car = require('../models/Car');
const moment = require('moment');
const mongoose = require('mongoose');

const router = express.Router();

// Helper to handle async errors
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper: Validate date inputs
const validateDates = (startDate, endDate) => {
    if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
        throw new Error('Noto‘g‘ri sana formati');
    }
    if (moment(endDate).isBefore(moment(startDate))) {
        throw new Error('Tugash sanasi boshlang‘ich sanadan oldin bo‘lishi mumkin emas');
    }
};

// Create a rental
router.post('/', asyncHandler(async (req, res) => {
    const { customer, borrowedProducts, startDate, endDate, car, status } = req.body;

    // Validate fields
    if (!customer || !borrowedProducts || !startDate || !endDate) {
        return res.status(400).json({ success: false, message: "Mijoz, mahsulotlar va sanalar talab qilinadi" });
    }
    validateDates(startDate, endDate);

    // Validate customer
    const customerDoc = await Customer.findById(customer);
    if (!customerDoc) {
        return res.status(404).json({ success: false, message: "Mijoz topilmadi" });
    }

    // Validate and check product availability
    const productUpdates = borrowedProducts.map(async (item) => {
        const product = await Product.findById(item.product);
        if (!product || product.quantity < item.quantity) {
            throw new Error(`${item.product} ID raqamli mahsulot mavjud emas yoki yetarli miqdorda emas`);
        }
        return Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } }, { new: true });
    });
    await Promise.all(productUpdates);

    // Create rental
    const rental = new Rental({
        customer,
        borrowedProducts: borrowedProducts.map(item => ({ ...item, startDate, endDate })),
        startDate,
        endDate,
        car,
        status: status || 'active'
    });

    // Update car availability
    if (car) {
        await Car.findByIdAndUpdate(car, { $set: { isAvailable: false } });
    }

    await rental.save();
    res.status(201).json({ success: true, message: 'Ijara muvaffaqiyatli yaratildi', data: rental });
}));

// Add borrowed product
router.post('/:rentalId/borrow', asyncHandler(async (req, res) => {
    const { rentalId } = req.params;
    const { product, quantity, startDate, endDate } = req.body;

    // Validate dates
    validateDates(startDate, endDate);

    // Validate rental
    const rental = await Rental.findById(rentalId);
    if (!rental) {
        return res.status(404).json({ success: false, message: "Ijara topilmadi" });
    }

    // Check product availability
    const productDoc = await Product.findById(product);
    if (!productDoc || productDoc.quantity < quantity) {
        return res.status(400).json({ success: false, message: "Mahsulot yetarli miqdorda mavjud emas" });
    }

    rental.borrowedProducts.push({ product, quantity, startDate, endDate });
    await Product.findByIdAndUpdate(product, { $inc: { quantity: -quantity } });

    await rental.save();
    res.json({ success: true, message: "Mahsulot ijaraga qo'shildi", data: rental });
}));

// Add returned product
router.post('/:rentalId/return', asyncHandler(async (req, res) => {
    const { rentalId } = req.params;
    const { product, quantity, returnDate } = req.body;

    // Validate rental
    const rental = await Rental.findById(rentalId).populate('borrowedProducts.product');
    if (!rental) {
        return res.status(404).json({ success: false, message: "Ijara topilmadi" });
    }

    const borrowedProduct = rental.borrowedProducts.find(bp => bp.product._id.toString() === product);
    if (!borrowedProduct || borrowedProduct.quantity < quantity) {
        return res.status(400).json({ success: false, message: "Qaytarilayotgan miqdor noto'g'ri" });
    }

    borrowedProduct.quantity -= quantity;
    rental.returnedProducts.push({ product, quantity, returnDate });

    // Update product inventory
    await Product.findByIdAndUpdate(product, { $inc: { quantity } });
    await rental.save();

    res.json({ success: true, message: "Mahsulot qaytarildi", data: rental });
}));

// Get all rentals
router.get('/', asyncHandler(async (req, res) => {
    const rentals = await Rental.find()
        .populate('customer', 'name phone')
        .populate('car', 'carNumber driverName')
        .sort('-createdAt');

    res.json({ success: true, data: rentals });
}));

// Get rental by ID
router.get('/:id', asyncHandler(async (req, res) => {
    const rental = await Rental.findById(req.params.id)
        .populate('customer', 'name phone')
        .populate('borrowedProducts.product', 'name')
        .populate('returnedProducts.product', 'name');

    if (!rental) {
        return res.status(404).json({ success: false, message: "Ijara topilmadi" });
    }

    res.json({ success: true, data: rental });
}));

module.exports = router;
