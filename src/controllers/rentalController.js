const Rental = require('../models/Rental');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const moment = require('moment');

// Create a new rental
exports.createRental = async (req, res) => {
    try {
        const { customer, products, startDate, endDate, carNumber } = req.body;

        // Validate dates
        if (moment(endDate).isBefore(moment(startDate))) {
            return res.status(400).json({ message: "End date must not be earlier than the start date." });
        }

        // Calculate total cost
        const totalCost = await calculateTotalCost(products, startDate, endDate);

        // Validate customer
        const customerDetails = await Customer.findById(customer);
        if (!customerDetails) {
            return res.status(404).json({ message: `Customer with ID ${customer} not found.` });
        }

        // Validate and update product stocks
        for (const { product, quantity } of products) {
            const productDetails = await Product.findById(product);
            if (!productDetails) {
                return res.status(404).json({ message: `Product with ID ${product} not found.` });
            }
            if (productDetails.quantity < (quantity || 1)) {
                return res.status(400).json({
                    message: `Insufficient stock for product: ${productDetails.name}. Available: ${productDetails.quantity}.`,
                });
            }

            // Update product quantity and availability
            productDetails.quantity -= quantity || 1;
            productDetails.availability = productDetails.quantity > 0;
            productDetails.rentalCount += 1;
            await productDetails.save();
        }

        // Save the rental
        const rental = new Rental({
            customer,
            products,
            startDate,
            endDate,
            totalCost,
            carNumber,
        });

        await rental.save();

        res.status(201).json(rental);
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Update a rental by ID
exports.updateRental = async (req, res) => {
    try {
        const rental = await Rental.findById(req.params.id);
        if (!rental) {
            return res.status(404).json({ message: "Rental not found." });
        }

        const { startDate, endDate, products, status } = req.body;

        // If rental is completed or cancelled, return products to stock
        if (status === 'completed' || status === 'cancelled') {
            for (const { product, quantity } of rental.products) {
                const productDetails = await Product.findById(product);
                if (productDetails) {
                    productDetails.quantity += quantity || 1;
                    productDetails.availability = true;
                    if (status === 'cancelled') {
                        productDetails.rentalCount -= 1;
                    }
                    await productDetails.save();
                }
            }
        }

        // If rental is completed, deduct the total cost from customer's balance
        if (status === 'completed') {
            const customerDetails = await Customer.findById(rental.customer);
            if (customerDetails) {
                customerDetails.balance -= rental.totalCost;
                await customerDetails.save();
            }
        }

        // Validate new dates
        if (startDate && endDate && moment(endDate).isBefore(moment(startDate))) {
            return res.status(400).json({ message: "End date must not be earlier than the start date." });
        }

        // Update rental details
        const updatedRental = await Rental.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedRental);
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


// Get all rentals
exports.getAllRentals = async (req, res) => {
    try {
        const rentals = await Rental.find()
            .populate('customer', 'name phone')
            .populate('products.product', 'name dailyRate');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get a rental by ID
exports.getRentalById = async (req, res) => {
    try {
        const rental = await Rental.findById(req.params.id)
            .populate('customer', 'name phone')
            .populate('products.product', 'name dailyRate');
        if (!rental) return res.status(404).json({ message: 'Rental not found' });
        res.json(rental);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// Delete a rental by ID
exports.deleteRental = async (req, res) => {
    try {
        const rental = await Rental.findByIdAndDelete(req.params.id);
        if (!rental) return res.status(404).json({ message: 'Rental not found' });
        res.json({ message: 'Rental deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all rentals by customer ID
exports.getRentalsByCustomerId = async (req, res) => {
    try {
        const rentals = await Rental.find({ customer: req.params.id })
            .populate('customer', 'name phone')
            .populate('products.product', 'name dailyRate');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all rentals by product ID
exports.getRentalsByProductId = async (req, res) => {
    try {
        const rentals = await Rental.find({ 'products.product': req.params.id })
            .populate('customer', 'name phone')
            .populate('products.product', 'name dailyRate');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper function to calculate the total rental cost
async function calculateTotalCost(products, startDate, endDate) {
    const days = moment(endDate).diff(moment(startDate), 'days') + 1;
    let totalCost = 0;
    for (const { product, quantity } of products) {
        const productDetails = await Product.findById(product);
        if (productDetails && productDetails.dailyRate) {
            totalCost += productDetails.dailyRate * days * (quantity || 1);
        }
    }

    return totalCost;
}
