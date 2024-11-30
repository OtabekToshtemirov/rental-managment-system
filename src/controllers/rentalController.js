const Rental = require('../models/Rental');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const moment = require('moment');
const mongoose = require('mongoose');

// Helper function to calculate rental cost
async function calculateRentalCost(productId, quantity, startDate, returnDate) {
    const product = await Product.findById(productId);
    if (!product || !product.dailyRate) {
        throw new Error(`Invalid product or daily rate for product ID: ${productId}`);
    }

    if (!moment(startDate).isValid() || !moment(returnDate).isValid()) {
        throw new Error('Invalid date format provided');
    }

    if (moment(returnDate).isBefore(moment(startDate))) {
        throw new Error('Return date cannot be before start date');
    }

    const days = Math.max(1, moment(returnDate).diff(moment(startDate), 'days') + 1);
    return {
        cost: product.dailyRate * days * quantity,
        days,
        dailyRate: product.dailyRate
    };
}

// Helper function to calculate total rental summary
async function calculateRentalSummary(borrowedProducts, startDate, endDate) {
    if (!Array.isArray(borrowedProducts) || borrowedProducts.length === 0) {
        throw new Error('No borrowed products provided');
    }

    if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
        throw new Error('Invalid date format provided');
    }

    let totalCost = 0;
    const rentalDays = Math.max(1, moment(endDate).diff(moment(startDate), 'days') + 1);
    const productSummary = [];

    for (const { product: productId, quantity } of borrowedProducts) {
        try {
            const { cost, dailyRate } = await calculateRentalCost(productId, quantity, startDate, endDate);
            const product = await Product.findById(productId);
            
            if (!product) {
                throw new Error(`Product not found: ${productId}`);
            }
            
            productSummary.push({
                product: product.name,
                quantity,
                dailyRate,
                subtotal: cost,
                rentalDays
            });
            
            totalCost += cost;
        } catch (error) {
            throw new Error(`Error calculating cost for product ${productId}: ${error.message}`);
        }
    }

    return {
        totalCost,
        rentalDays,
        productSummary,
        startDate: moment(startDate).toDate(),
        endDate: moment(endDate).toDate()
    };
}

exports.createRental = async (req, res) => {
    try {
        const { customer, borrowedProducts, startDate, endDate, carNumber, status } = req.body;

        // Validate dates
        if (moment(endDate).isBefore(moment(startDate))) {
            return res.status(400).json({ message: "End date must not be earlier than the start date." });
        }

        // Validate customer
        const customerDetails = await Customer.findById(customer);
        if (!customerDetails) {
            return res.status(404).json({ message: `Customer with ID ${customer} not found.` });
        }

        // Validate and update product stocks
        for (const { product, quantity } of borrowedProducts) {
            const productDetails = await Product.findById(product);
            if (!productDetails) {
                return res.status(404).json({ message: `Product with ID ${product} not found.` });
            }
            if (productDetails.quantity < quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for product: ${productDetails.name}. Available: ${productDetails.quantity}.`,
                });
            }

            // Update product quantity and availability
            productDetails.quantity -= quantity;
            productDetails.availability = productDetails.quantity > 0;
            productDetails.rentalCount += 1;
            await productDetails.save();
        }

        // Calculate rental summary if status is completed
        let rentalSummary = null;
        let totalCost = 0;
        
        if (status === 'completed') {
            try {
                rentalSummary = await calculateRentalSummary(borrowedProducts, startDate, endDate);
                totalCost = rentalSummary.totalCost;
                
                // Update customer balance
                customerDetails.balance -= totalCost;
                await customerDetails.save();
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }
        }

        // Save the rental
        const rental = new Rental({
            customer,
            borrowedProducts,
            returnedProducts: [], // Initially empty
            startDate,
            endDate,
            totalCost,
            carNumber,
            status: status || 'active'
        });

        await rental.save();
        
        const response = {
            rental,
            message: 'Rental created successfully.'
        };

        if (rentalSummary) {
            response.summary = rentalSummary;
        }

        res.status(201).json(response);
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.addBorrowedProduct = async (req, res) => {
    try {
        const { rentalId, product, quantity, startDate, endDate } = req.body;

        // Validate input
        if (!rentalId || !product || !quantity) {
            return res.status(400).json({
                message: 'Required fields missing: rentalId, product, and quantity are required'
            });
        }

        // Find and populate rental
        const rental = await Rental.findById(rentalId)
            .populate('customer', 'name phone')
            .populate('borrowedProducts.product', 'name dailyRate')
            .populate('returnedProducts.product', 'name dailyRate');

        if (!rental) {
            return res.status(404).json({ message: 'Rental not found.' });
        }

        // Check rental status
        if (rental.status !== 'active') {
            return res.status(400).json({
                message: `Cannot add products to ${rental.status} rental`
            });
        }

        const productDetails = await Product.findById(product);
        if (!productDetails) {
            return res.status(404).json({ message: `Product with ID ${product} not found.` });
        }

        if (productDetails.quantity < quantity) {
            return res.status(400).json({
                message: `Insufficient stock for product: ${productDetails.name}. Available: ${productDetails.quantity}.`,
            });
        }

        // Update product stock
        productDetails.quantity -= quantity;
        productDetails.availability = productDetails.quantity > 0;
        productDetails.rentalCount += 1;
        await productDetails.save();

        // Add to borrowed products with dates
        const borrowedProduct = {
            product,
            quantity,
            startDate: startDate || rental.startDate,
            endDate: endDate || rental.endDate
        };
        
        rental.borrowedProducts.push(borrowedProduct);
        await rental.save();

        // Re-fetch rental to get populated data
        const updatedRental = await Rental.findById(rentalId)
            .populate('customer', 'name phone')
            .populate('borrowedProducts.product', 'name dailyRate')
            .populate('returnedProducts.product', 'name dailyRate');

        res.status(200).json({
            message: 'Product added to borrowed list successfully',
            rental: updatedRental,
            addedProduct: {
                product: productDetails,
                quantity,
                startDate: borrowedProduct.startDate,
                endDate: borrowedProduct.endDate
            }
        });
    } catch (error) {
        console.error('Error in addBorrowedProduct:', error);
        res.status(500).json({ 
            message: "Error adding borrowed product", 
            error: error.message
        });
    }
};

exports.addReturnedProduct = async (req, res) => {
    try {
        const { rentalId, product, quantity, startDate, returnDate } = req.body;

        const rental = await Rental.findById(rentalId)
            .populate('borrowedProducts.product', 'name dailyRate');
            
        if (!rental) {
            return res.status(404).json({ message: 'Rental not found.' });
        }

        // Check if the product exists in borrowedProducts
        const borrowed = rental.borrowedProducts.find(item => 
            item.product && item.product._id && item.product._id.toString() === product
        );
        
        if (!borrowed) {
            return res.status(400).json({ message: 'Product not found in borrowed items.' });
        }

        // Calculate remaining quantity
        const alreadyReturned = rental.returnedProducts
            .filter(item => item.product.toString() === product)
            .reduce((sum, item) => sum + item.quantity, 0);
        
        const remainingQuantity = borrowed.quantity - alreadyReturned;

        if (quantity > remainingQuantity) {
            return res.status(400).json({ 
                message: `Cannot return ${quantity} items. Only ${remainingQuantity} remaining.` 
            });
        }

        const actualReturnDate = returnDate ? new Date(returnDate) : new Date();
        const rentalStartDate = borrowed.startDate || rental.startDate;

        // Calculate rental duration in days
        const durationInMs = actualReturnDate - rentalStartDate;
        const durationInDays = Math.max(1, Math.ceil(durationInMs / (1000 * 60 * 60 * 24)));
        
        // Calculate cost for this return
        const dailyRate = borrowed.product.dailyRate || 0;
        const cost = quantity * dailyRate * durationInDays;

        // Create the return record
        const returnRecord = { 
            product, 
            quantity, 
            returnDate: actualReturnDate,
            cost // This is now optional with a default value of 0
        };

        // Add to returned products
        rental.returnedProducts.push(returnRecord);

        // Update total cost
        rental.totalCost = (rental.totalCost || 0) + cost;

        // Return items to stock
        const productDetails = await Product.findById(product);
        if (productDetails) {
            productDetails.quantity += quantity;
            productDetails.availability = true;
            await productDetails.save();
        }

        // Check if all products are returned
        let allReturned = true;
        for (const borrowedItem of rental.borrowedProducts) {
            const totalReturned = rental.returnedProducts
                .filter(item => item.product.toString() === borrowedItem.product._id.toString())
                .reduce((sum, item) => sum + item.quantity, 0);
            
            if (totalReturned < borrowedItem.quantity) {
                allReturned = false;
                break;
            }
        }

        if (allReturned) {
            rental.status = 'completed';
        }

        // Save updated rental
        await rental.save();

        // Get return history for this product
        const returnHistory = rental.returnedProducts
            .filter(item => item.product.toString() === product)
            .map(item => ({
                quantity: item.quantity,
                returnDate: item.returnDate,
                cost: item.cost || 0
            }));

        // Calculate total returned quantity and cost for this product
        const totalReturnedForProduct = returnHistory.reduce((acc, item) => ({
            quantity: acc.quantity + item.quantity,
            cost: (acc.cost || 0) + (item.cost || 0)
        }), { quantity: 0, cost: 0 });

        res.status(200).json({ 
            message: 'Product returned successfully.', 
            rental,
            currentReturn: {
                quantity,
                returnDate: actualReturnDate,
                cost: cost || 0
            },
            productSummary: {
                productName: borrowed.product.name,
                totalReturned: totalReturnedForProduct.quantity,
                totalCost: totalReturnedForProduct.cost || 0,
                remainingQuantity: remainingQuantity - quantity,
                dailyRate: dailyRate,
                durationInDays
            },
            returnHistory
        });
    } catch (error) {
        console.error('Error in addReturnedProduct:', error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.updateRental = async (req, res) => {
    try {
        const { customer, borrowedProducts, carNumber, status, startDate, endDate } = req.body;
        const rentalId = req.params.id;

        // Find the rental and populate necessary fields
        const rental = await Rental.findById(rentalId)
            .populate('borrowedProducts.product', 'name dailyRate');

        if (!rental) {
            return res.status(404).json({ message: 'Rental not found.' });
        }

        // Validate if rental can be updated
        if ((rental.status === 'completed' || rental.status === 'cancelled') && 
            !req.body.status) { // Allow status updates even for completed/cancelled rentals
            return res.status(400).json({ 
                message: `Cannot update rental with status: ${rental.status}` 
            });
        }

        // Update simple fields if provided
        if (carNumber) rental.carNumber = carNumber;
        if (status) rental.status = status;
        if (customer) rental.customer = customer;

        // Validate and update dates if provided
        if (startDate && endDate) {
            const startMoment = moment(startDate);
            const endMoment = moment(endDate);

            if (endMoment.isBefore(startMoment)) {
                return res.status(400).json({ 
                    message: "End date must not be earlier than start date." 
                });
            }

            rental.startDate = startMoment.toDate();
            rental.endDate = endMoment.toDate();

            // Update dates for all borrowed products if global dates changed
            rental.borrowedProducts.forEach(item => {
                item.startDate = startMoment.toDate();
                item.endDate = endMoment.toDate();
            });
        }

        // Update borrowed products if provided
        if (borrowedProducts && Array.isArray(borrowedProducts)) {
            // Validate each borrowed product
            for (const item of borrowedProducts) {
                if (!item.product || !item.quantity) {
                    return res.status(400).json({
                        message: "Each borrowed product must have product ID and quantity"
                    });
                }

                const product = await Product.findById(item.product);
                if (!product) {
                    return res.status(400).json({
                        message: `Product not found: ${item.product}`
                    });
                }
            }

            rental.borrowedProducts = borrowedProducts;
        }

        // Recalculate total cost if necessary
        if (borrowedProducts || startDate || endDate) {
            let totalCost = 0;
            for (const item of rental.borrowedProducts) {
                const product = await Product.findById(item.product);
                if (product) {
                    const duration = moment(rental.endDate).diff(moment(rental.startDate), 'days') + 1;
                    totalCost += item.quantity * product.dailyRate * duration;
                }
            }
            rental.totalCost = totalCost;
        }

        // Save the updated rental
        await rental.save();

        res.status(200).json({
            message: 'Rental updated successfully',
            rental: await Rental.findById(rental._id)
                .populate('customer', 'name phone')
                .populate('borrowedProducts.product', 'name dailyRate')
        });

    } catch (error) {
        console.error('Error in updateRental:', error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.getAllRentals = async (req, res) => {
    try {
        const rentals = await Rental.find()
            .populate('customer', 'name phone')
            .populate('borrowedProducts.product', 'name dailyRate')
            .populate('returnedProducts.product', 'name dailyRate');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.getRentalById = async (req, res) => {
    try {
        const rental = await Rental.findById(req.params.id)
            .populate('customer', 'name phone')
            .populate('borrowedProducts.product', 'name dailyRate')
            .populate('returnedProducts.product', 'name dailyRate');
        if (!rental) {
            return res.status(404).json({ message: 'Rental not found.' });
        }
        res.json(rental);
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.deleteRental = async (req, res) => {
    try {
        const rental = await Rental.findByIdAndDelete(req.params.id);
        if (!rental) {
            return res.status(404).json({ message: 'Rental not found.' });
        }
        res.json({ message: 'Rental deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.getRentalsByCustomerId = async (req, res) => {
    try {
        const rentals = await Rental.find({ customer: req.params.id })
            .populate('customer', 'name phone')
            .populate('borrowedProducts.product', 'name dailyRate')
            .populate('returnedProducts.product', 'name dailyRate');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

exports.getRentalsByProductId = async (req, res) => {
    try {
        const rentals = await Rental.find({ 
            $or: [
                { 'borrowedProducts.product': req.params.id },
                { 'returnedProducts.product': req.params.id }
            ]
        })
            .populate('customer', 'name phone')
            .populate('borrowedProducts.product', 'name dailyRate')
            .populate('returnedProducts.product', 'name dailyRate');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Get active rentals
exports.getActiveRentals = async (req, res) => {
    try {
        const rentals = await Rental.find({ status: 'active' })
            .populate('customer', 'name phone')
            .populate('borrowedProducts.product', 'name dailyRate')
            .populate('returnedProducts.product', 'name dailyRate');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Get completed rentals
exports.getCompletedRentals = async (req, res) => {
    try {
        const rentals = await Rental.find({ status: 'completed' })
            .populate('customer', 'name phone')
            .populate('borrowedProducts.product', 'name dailyRate')
            .populate('returnedProducts.product', 'name dailyRate');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};