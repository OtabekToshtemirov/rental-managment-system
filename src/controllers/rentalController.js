const Rental = require('../models/Rental');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Car = require('../models/Car');
const moment = require('moment');
const mongoose = require('mongoose');

// Helper function to calculate rental cost
async function calculateRentalCost(productId, quantity, startDate, returnDate) {
    const product = await Product.findById(productId);
    if (!product || !product.dailyRate) {
        throw new Error(`Mahsulot topilmadi yoki kunlik narxi belgilanmagan: ${productId}`);
    }

    if (!moment(startDate).isValid() || !moment(returnDate).isValid()) {
        throw new Error('Sana formati noto\'g\'ri');
    }

    if (moment(returnDate).isBefore(moment(startDate))) {
        throw new Error('Qaytarish sanasi boshlang\'ich sanadan oldin bo\'lishi mumkin emas');
    }

    const days = Math.max(1, moment(returnDate).diff(moment(startDate), 'days'));
    const cost = product.dailyRate * days * quantity;
    
    return {
        cost,
        days,
        dailyRate: product.dailyRate
    };
}

// Helper function to calculate total rental summary
async function calculateRentalSummary(borrowedProducts, returnedProducts, startDate, endDate) {
    if (!Array.isArray(borrowedProducts) || borrowedProducts.length === 0) {
        throw new Error('Ijaraga olingan mahsulotlar ro\'yxati bo\'sh');
    }

    if (!moment(startDate).isValid() || !moment(endDate).isValid()) {
        throw new Error('Sana formati noto\'g\'ri');
    }

    let totalCost = 0;
    const productSummary = [];

    // Only calculate costs for returned products
    if (returnedProducts && returnedProducts.length > 0) {
        for (const { product: productId, quantity, returnDate } of returnedProducts) {
            try {
                const { cost, days, dailyRate } = await calculateRentalCost(
                    productId,
                    quantity,
                    startDate,
                    returnDate
                );

                const product = await Product.findById(productId);
                if (!product) {
                    throw new Error(`Mahsulot topilmadi: ${productId}`);
                }

                productSummary.push({
                    product: product.name,
                    quantity,
                    dailyRate,
                    subtotal: cost,
                    days,
                    returnDate
                });

                totalCost += cost;
            } catch (error) {
                throw new Error(`Mahsulot uchun narx hisoblashda xatolik: ${productId}: ${error.message}`);
            }
        }
    }

    return {
        totalCost,
        productSummary,
        startDate: moment(startDate).toDate(),
        endDate: moment(endDate).toDate()
    };
}

exports.createRental = async (req, res) => {
    try {
        const { customer, borrowedProducts, startDate, endDate, car, status } = req.body;

        // Validate dates
        if (moment(endDate).isBefore(moment(startDate))) {
            return res.status(400).json({ message: "Tugash sanasi boshlang'ich sanadan oldin bo'lishi mumkin emas" });
        }

        // Validate customer
        const customerDetails = await Customer.findById(customer);
        if (!customerDetails) {
            return res.status(404).json({ message: `${customer} ID raqamli mijoz topilmadi` });
        }

        // Validate car if provided
        if (car) {
            const carDetails = await Car.findById(car);
            if (!carDetails) {
                return res.status(404).json({ message: `${car} ID raqamli mashina topilmadi` });
            }
            // Increment rental count for the car
            carDetails.rentalCount += 1;
            await carDetails.save();
        }

        // Validate and update product stocks
        for (const { product, quantity } of borrowedProducts) {
            const productDetails = await Product.findById(product);
            if (!productDetails) {
                return res.status(404).json({ message: `${product} ID raqamli mahsulot topilmadi` });
            }
            if (productDetails.quantity < quantity) {
                return res.status(400).json({
                    message: `${productDetails.name} mahsuloti uchun yetarli miqdor mavjud emas. Mavjud: ${productDetails.quantity}`,
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
                rentalSummary = await calculateRentalSummary(borrowedProducts, [], startDate, endDate);
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
            car,
            status: status || 'active'
        });

        await rental.save();
        
        const response = {
            rental,
            message: 'Ijara muvaffaqiyatli yaratildi'
        };

        if (rentalSummary) {
            response.summary = rentalSummary;
        }

        res.status(201).json(response);
    } catch (error) {
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
    }
};

exports.addBorrowedProduct = async (req, res) => {
    try {
        const { rentalId, product, quantity, startDate, endDate } = req.body;

        // Validate input
        if (!rentalId || !product || !quantity) {
            return res.status(400).json({
                message: 'Ijaraga olingan mahsulot uchun zaruriy ma\'lumotlar yetarli emas'
            });
        }

        // Find and populate rental
        const rental = await Rental.findById(rentalId)
            .populate('customer', 'name phone')
            .populate('borrowedProducts.product', 'name dailyRate')
            .populate('returnedProducts.product', 'name dailyRate');

        if (!rental) {
            return res.status(404).json({ message: 'Ijara topilmadi' });
        }

        // Check rental status
        if (rental.status !== 'active') {
            return res.status(400).json({
                message: `Ijara holati ${rental.status} bo'lgani uchun mahsulot qo'shib bo'lmaydi`
            });
        }

        const productDetails = await Product.findById(product);
        if (!productDetails) {
            return res.status(404).json({ message: `${product} ID raqamli mahsulot topilmadi` });
        }

        if (productDetails.quantity < quantity) {
            return res.status(400).json({
                message: `${productDetails.name} mahsuloti uchun yetarli miqdor mavjud emas. Mavjud: ${productDetails.quantity}`,
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
            message: 'Mahsulot muvaffaqiyatli qo\'shildi',
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
            message: "Mahsulot qo'shishda xatolik yuz berdi", 
            error: error.message
        });
    }
};

exports.addReturnedProduct = async (req, res) => {
    try {
        const { rentalId, product, quantity, returnDate } = req.body;

        // Validate input
        if (!rentalId || !product || !quantity || !returnDate) {
            return res.status(400).json({
                message: 'Qaytarilgan mahsulot uchun zaruriy ma\'lumotlar yetarli emas'
            });
        }

        // Find and populate rental
        const rental = await Rental.findById(rentalId)
            .populate('customer', 'name phone')
            .populate('borrowedProducts.product', 'name dailyRate')
            .populate('returnedProducts.product', 'name dailyRate');

        if (!rental) {
            return res.status(404).json({ message: 'Ijara topilmadi' });
        }

        // Check rental status
        if (rental.status === 'completed' || rental.status === 'cancelled') {
            return res.status(400).json({
                message: `Ijara holati ${rental.status} bo'lgani uchun mahsulot qaytarib bo'lmaydi`
            });
        }

        // Find the borrowed product
        const borrowed = rental.borrowedProducts.find(
            item => item.product._id.toString() === product
        );

        if (!borrowed) {
            return res.status(404).json({ message: 'Bu mahsulot ijaraga olinmagan' });
        }

        // Calculate total returned quantity for this product
        const totalReturned = rental.returnedProducts
            .filter(item => item.product.toString() === product)
            .reduce((sum, item) => sum + item.quantity, 0);

        const remainingQuantity = borrowed.quantity - totalReturned;

        if (remainingQuantity < quantity) {
            return res.status(400).json({
                message: `Qaytarilayotgan miqdor xato. Qaytarish mumkin bo'lgan miqdor: ${remainingQuantity}`
            });
        }

        const actualReturnDate = moment(returnDate).toDate();

        // Calculate cost for returned product
        const { cost } = await calculateRentalCost(
            product,
            quantity,
            rental.startDate,
            actualReturnDate
        );

        // Create return record
        const returnRecord = {
            product,
            quantity,
            returnDate: actualReturnDate,
            cost
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

        res.status(200).json({
            message: 'Mahsulot muvaffaqiyatli qaytarildi',
            rental,
            returnedProduct: {
                product: productDetails,
                quantity,
                returnDate: actualReturnDate,
                cost
            }
        });
    } catch (error) {
        console.error('Error in addReturnedProduct:', error);
        res.status(500).json({
            message: "Mahsulot qaytarishda xatolik yuz berdi",
            error: error.message
        });
    }
};

exports.updateRental = async (req, res) => {
    try {
        const { customer, borrowedProducts, car, status, startDate, endDate } = req.body;
        const rentalId = req.params.id;

        // Find the rental and populate necessary fields
        const rental = await Rental.findById(rentalId)
            .populate('borrowedProducts.product', 'name dailyRate');

        if (!rental) {
            return res.status(404).json({ message: 'Ijara topilmadi' });
        }

        // Validate if rental can be updated
        if ((rental.status === 'completed' || rental.status === 'cancelled') && 
            !req.body.status) { // Allow status updates even for completed/cancelled rentals
            return res.status(400).json({ 
                message: `Ijara holati ${rental.status} bo'lgani uchun yangilash mumkin emas` 
            });
        }

        // Update simple fields if provided
        if (car) rental.car = car;
        if (status) rental.status = status;
        if (customer) rental.customer = customer;

        // Validate and update dates if provided
        if (startDate && endDate) {
            const startMoment = moment(startDate);
            const endMoment = moment(endDate);

            if (endMoment.isBefore(startMoment)) {
                return res.status(400).json({ 
                    message: "Tugash sanasi boshlang'ich sanadan oldin bo'lishi mumkin emas" 
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
                        message: "Ijaraga olingan har bir mahsulot uchun mahsulot ID va miqdor zarur"
                    });
                }

                const product = await Product.findById(item.product);
                if (!product) {
                    return res.status(400).json({
                        message: `${item.product} ID raqamli mahsulot topilmadi`
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
            message: 'Ijara muvaffaqiyatli yangilandi',
            rental: await Rental.findById(rental._id)
                .populate('customer', 'name phone')
                .populate('borrowedProducts.product', 'name dailyRate')
        });

    } catch (error) {
        console.error('Error in updateRental:', error);
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
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
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
    }
};

exports.getRentalById = async (req, res) => {
    try {
        const rental = await Rental.findById(req.params.id)
            .populate('customer', 'name phone')
            .populate('borrowedProducts.product', 'name dailyRate')
            .populate('returnedProducts.product', 'name dailyRate');
        if (!rental) {
            return res.status(404).json({ message: 'Ijara topilmadi' });
        }
        res.json(rental);
    } catch (error) {
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
    }
};

exports.deleteRental = async (req, res) => {
    try {
        const rental = await Rental.findByIdAndDelete(req.params.id);
        if (!rental) {
            return res.status(404).json({ message: 'Ijara topilmadi' });
        }
        res.json({ message: 'Ijara muvaffaqiyatli o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
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
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
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
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
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
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
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
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
    }
};