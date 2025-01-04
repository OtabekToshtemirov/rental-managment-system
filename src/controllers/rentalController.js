const Rental = require('../models/Rental');
const Product = require('../models/Product');
const Car = require('../models/Car');
const Customer = require('../models/Customer');
const Payment = require('../models/Payments');
const moment = require('moment');

// Mahsulot ijaraga olish
exports.createRental = async (req, res) => {
    try {
        const rentalData = req.body;
        console.log('Received rental data:', JSON.stringify(rentalData, null, 2));

        // Basic validation
        if (!rentalData.customer) {
            return res.status(400).json({ message: 'Mijoz tanlanishi shart' });
        }

        if (!Array.isArray(rentalData.borrowedProducts) || rentalData.borrowedProducts.length === 0) {
            return res.status(400).json({ message: 'Kamida bitta mahsulot tanlash kerak' });
        }

        // Generate rental number
        let rentalNumber;
        try {
            // Find the latest rental with a valid rental number
            const latestRental = await Rental.findOne({
                rentalNumber: { $type: "string", $regex: /^\d+$/ }
            }).sort({ rentalNumber: -1 });

            if (latestRental && latestRental.rentalNumber && !isNaN(parseInt(latestRental.rentalNumber))) {
                // Increment the number
                const nextNumber = parseInt(latestRental.rentalNumber) + 1;
                rentalNumber = nextNumber.toString();
            } else {
                // If no valid rental number found or if latest is NaN, start from 1
                rentalNumber = '1';
            }
        } catch (error) {
            console.error('Error generating rental number:', error);
            return res.status(500).json({ 
                message: 'Ijara raqamini yaratishda xatolik',
                details: error.message 
            });
        }

        // add prepaid payment if provided
        if (rentalData.prepaidAmount && parseFloat(rentalData.prepaidAmount) > 0) {
            rentalData.payments = [{
                amount: parseFloat(rentalData.prepaidAmount),
                paymentType: 'cash',
                paymentDate: new Date(),
                description: 'Oldindan to\'lov'
            }];
            // Set initial debt to totalCost minus prepaid amount, ensuring it's not negative
            rentalData.debt = Math.max(0, rentalData.totalCost - parseFloat(rentalData.prepaidAmount));
        }

        // Har bir mahsulot uchun miqdorini tekshirish va kamaytirish
        for (const item of rentalData.borrowedProducts) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({ message: `Mahsulot topilmadi: ${item.product}` });
            }

            // Miqdorni tekshirish
            if (product.quantity < item.quantity) {
                return res.status(400).json({ 
                    message: `${product.name} mahsulotidan yetarli miqdor yo'q. Mavjud: ${product.quantity}, So'ralgan: ${item.quantity}` 
                });
            }

            // Miqdorni kamaytirish
            product.quantity -= item.quantity;
            await product.save();
        }

        // Create the rental
        const rental = new Rental({
            ...rentalData,
            rentalNumber,
            workStartDate: new Date(rentalData.workStartDate),
            borrowedProducts: rentalData.borrowedProducts.map(item => ({
                ...item,
                startDate: new Date(rentalData.workStartDate),
                rentDate: new Date()
            })),
            status: 'active',
            createdAt: new Date(),
            totalCost: Number(rentalData.totalCost || 0),
            debt: rentalData.debt,
            description: req.body.description
        });

        await rental.save();

        // create prepaid payment if provided
        if (rentalData.prepaidAmount && parseFloat(rentalData.prepaidAmount) > 0) {
            const payment = new Payment({
                customer: rentalData.customer,
                rental: rental._id,
                amount: parseFloat(rentalData.prepaidAmount),
                paymentType: 'cash',
                paymentDate: new Date(),
                isPrepaid: true,
                description: 'Oldindan to\'lov'
            });
            await payment.save();

            // Update rental debt
            rental.debt = Math.max(0, rental.totalCost - parseFloat(rentalData.prepaidAmount));
            await rental.save();
        }

        // Populate the rental data
        const populatedRental = await Rental.findById(rental._id)
            .populate('customer')
            .populate({
                path: 'borrowedProducts.product',
                populate: {
                    path: 'parts.product',
                    select: 'name'
                }
            })
            .populate('car');

        res.status(201).json(populatedRental);
    } catch (error) {
        console.error('Error creating rental:', error);
        res.status(500).json({ 
            message: 'Ijarani yaratishda xatolik yuz berdi', 
            error: error.message 
        });
    }
};

// Add payment to rental
// Add payment to rental
exports.addPayment = async (req, res) => {
    try {
        const { rentalId } = req.params;
        const paymentData = req.body;

        const rental = await Rental.findById(rentalId);
        if (!rental) {
            return res.status(404).json({ message: 'Rental not found' });
        }

        // Create new payment
        const payment = new Payment({
            customer: rental.customer,
            rental: rentalId,
            amount: paymentData.amount,
            paymentType: paymentData.paymentType || 'cash',
            description: paymentData.description,
            isPrepaid: false
        });
        await payment.save();

        // Update rental debt
        rental.debt = Math.max(0, rental.debt - payment.amount);
        await rental.save();

        // Update customer balance (+)
        const customer = await Customer.findById(rental.customer);
        if (customer) {
            customer.balance = (customer.balance || 0) + payment.amount;
            await customer.save();
        }

        const populatedRental = await Rental.findById(rental._id)
            .populate('customer')
            .populate('car')
            .populate('borrowedProducts.product')
            .populate('returnedProducts.product');

        res.json(populatedRental);
    } catch (error) {
        console.error('To\'lov qo\'shishda xatolik:', error);
        res.status(500).json({ 
            message: 'To\'lov qo\'shishda xatolik yuz berdi', 
            error: error.message 
        });
    }
};



// get all rentals
exports.getAllRentals = async (req, res) => {
    try {
        console.log('Fetching all rentals...');
        const rentals = await Rental.find()
            
            .populate('customer')
            .populate({
                path: 'borrowedProducts.product',
                populate: {
                    path: 'parts.product',
                    select: 'name'
                }
            })
            .sort({ createdAt: -1 });

        console.log(`Found ${rentals.length} rentals`);

        // Get all payments for all rentals
        const rentalIds = rentals.map(rental => rental._id);
        console.log('Fetching payments for rental IDs:', rentalIds);

        const allPayments = await Payment.find({
            rental: { $in: rentalIds }
        }).lean();

        console.log(`Found ${allPayments.length} payments`);

        // Calculate rental days and total payments for each rental
        const rentalsWithDetails = rentals.map((rental) => {
            const rentalObj = rental.toObject();
            const startDate = new Date(rental.workStartDate);
            const now = new Date();
            const days = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
            
            // Get payments for this rental
            const rentalPayments = allPayments.filter(payment => 
                payment.rental.toString() === rental._id.toString()
            );
            const totalPayments = rentalPayments.reduce((sum, payment) => sum + payment.amount, 0);
            
            return {
                ...rentalObj,
                rentalDays: days,
                totalPayments,
                remainingAmount: rental.totalCost - totalPayments,
                debt: rental.debt,
                payments: rentalPayments
            };
        });

        console.log(`Processed ${rentalsWithDetails.length} rentals with details`);
        res.json(rentalsWithDetails);
    } catch (error) {
        console.error('Error in getAllRentals:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid ID format' });
        }
        res.status(500).json({ 
            message: 'Internal server error while fetching rentals',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
// get rentals by customer id
exports.getRentalsByCustomerId = async (req, res) => {
    try {
        const rentals = await Rental.find({ customer: req.params.id })
            .populate('customer')
            .populate('car')
            .populate('borrowedProducts.product')
            .populate('returnedProducts.product')
            .sort({ createdAt: -1 });

        // Calculate rental days and total payments for each rental
        const rentalsWithDetails = rentals.map(rental => {
            const rentalObj = rental.toObject();
            const startDate = new Date(rental.workStartDate);
            const now = new Date();
            const days = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
            
            // Calculate total payments
            const totalPayments = rental.payments.reduce((sum, payment) => sum + payment.amount, 0);
            
            return {
                ...rentalObj,
                rentalDays: days,
                totalPayments,
                remainingAmount: rental.totalCost - totalPayments,
                debt: rental.debt // Add debt to response
            };
        });

        res.json(rentalsWithDetails);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mahsulotlarni qaytarish
exports.returnProduct = async (req, res) => {
    try {
        const { rentalId } = req.params;
        const returnData = req.body;

        console.log('Return data received:', { rentalId, returnData });

        if (!returnData.products || !Array.isArray(returnData.products)) {
            return res.status(400).json({ message: 'Invalid products data' });
        }

        const rental = await Rental.findById(rentalId);
        if (!rental) {
            return res.status(404).json({ message: 'Rental not found' });
        }

        // Calculate total return amount
        let totalReturnAmount = 0;

        // Process each returned product
        for (const returnItem of returnData.products) {
            console.log('Processing return item:', returnItem);

            if (!returnItem.product || !returnItem.quantity || !returnItem.returnDate) {
                throw new Error('Missing required fields in return item');
            }

            const borrowedProduct = rental.borrowedProducts.find(
                bp => bp.product.toString() === returnItem.product
            );

            if (!borrowedProduct) {
                throw new Error(`Product ${returnItem.product} not found in rental`);
            }

            // Calculate days and cost for this product
            const startDate = new Date(returnItem.startDate || borrowedProduct.startDate || rental.startDate);
            const returnDate = new Date(returnItem.returnDate);
            const days = Math.max(1, Math.ceil((returnDate - startDate) / (1000 * 60 * 60 * 24)));
            
            // Chegirma kunlarini hisoblaymiz
            const discountDays = Number(returnItem.discountDays) || 0;
            
            // Kunlik narxni olamiz
            const dailyRate = Number(returnItem.dailyRate) || Number(borrowedProduct.dailyRate) || 0;
            
            // Jami summani hisoblaymiz
            const totalDays = Math.max(1, days - discountDays);
            const totalCost = Number(totalDays * dailyRate * returnItem.quantity);

            totalReturnAmount += totalCost;

            try {
                // Update product quantity in inventory
                await Product.findByIdAndUpdate(returnItem.product, {
                    $inc: { quantity: returnItem.quantity }
                });

                // Add to returned products
                const returnedProduct = {
                    product: returnItem.product,
                    quantity: Number(returnItem.quantity),
                    startDate: startDate,
                    returnDate: returnDate,
                    dailyRate: Number(dailyRate),
                    discountDays: Number(discountDays),
                    totalCost: Number(totalCost),
                    days: Number(totalDays)
                };

                console.log('Adding returned product:', returnedProduct);
                rental.returnedProducts.push(returnedProduct);
            } catch (error) {
                console.error('Error updating product:', error);
                throw new Error(`Failed to update product ${returnItem.product}`);
            }
        }

        // Update customer balance (-)
        try {
            const customer = await Customer.findById(rental.customer);
            if (customer) {
                customer.balance = (customer.balance || 0) - totalReturnAmount;
                await customer.save();
            }
        } catch (error) {
            console.error('Error updating customer:', error);
            throw new Error('Failed to update customer balance');
        }

        // Update rental status if all products are returned
        const allProductsReturned = rental.borrowedProducts.every(bp => {
            const returnedQuantity = rental.returnedProducts
                .filter(rp => rp.product.toString() === bp.product.toString())
                .reduce((sum, rp) => sum + rp.quantity, 0);
            return returnedQuantity >= bp.quantity;
        });

        if (allProductsReturned) {
            rental.status = 'completed';
            rental.endDate = new Date();
        }

        await rental.save();

        res.json({
            message: 'Products returned successfully',
            rental: rental,
            totalReturnAmount
        });
    } catch (error) {
        console.error('Return product error:', error);
        res.status(500).json({ 
            message: error.message || 'Failed to process return',
            error: error.toString()
        });
    }
};

// Ijara olish
exports.getRentalById = async (req, res) => {
    try {
        const rental = await Rental.findById(req.params.id)
            .populate('customer')
            .populate({
                path: 'borrowedProducts.product',
                populate: {
                    path: 'parts.product',
                    select: 'name'
                }
            });

        if (!rental) {
            return res.status(404).json({ message: 'Ijara topilmadi' });
        }

        // Calculate totals
        const totalAmount = rental.borrowedProducts.reduce((sum, item) => {
            return sum + (item.dailyRate * item.days);
        }, 0);

        const totalPaid = rental.payments ? rental.payments.reduce((sum, payment) => {
            return sum + payment.amount;
        }, 0) : 0;

        const rentalObj = rental.toObject();
        rentalObj.totalAmount = totalAmount;
        rentalObj.totalPaid = totalPaid;
        rentalObj.remainingAmount = totalAmount - totalPaid;

        res.json(rentalObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Aktiv ijaralarni olish
exports.getActiveRentals = async (req, res) => {
    try {
        const rentals = await Rental.find({ status: 'active' }).populate('customer car');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: 'Aktiv ijaralarni olishda xatolik yuz berdi', error });
    }
};

// Tamomlangan ijaralarni olish
exports.getCompleteRentals = async (req, res) => {
    try {
        const rentals = await Rental.find({ status: 'complete' }).populate('customer car');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: 'Tamamlangan ijaralarni olishda xatolik yuz berdi', error });
    }
};

// get rentals by car id
exports.getRentalsByCarId = async (req, res) => {
    try {
        const rentals = await Rental.find({ car: req.params.carId }).populate('customer car');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: 'Ijaralarni olishda xatolik yuz berdi', error });
    }
};

// get rentals by product id
exports.getRentalsByProductId = async (req, res) => {
    try {
        const productId = req.params.productId;

        const rentals = await Rental.find({
            'borrowedProducts.product': productId
        })
        .populate('customer')
        .populate('borrowedProducts.product')
        .populate('returnedProducts.product')
        .sort({ 'borrowedProducts.startDate': -1 }); // Eng yangi ijaralarni birinchi ko'rsatish

        res.json(rentals);
    } catch (error) {
        console.error('Error fetching rentals by product:', error);
        res.status(500).json({ message: error.message });
    }
};

// Ijara yangilash

exports.editRental = async (req, res) => {
    try {
        const { borrowedProducts, startDate, endDate, car } = req.body;
        const rentalId = req.params.id;

        // Ijarani topamiz
        const rental = await Rental.findById(rentalId).populate('borrowedProducts.product');

        if (!rental) {
            return res.status(404).json({ message: 'Ijara topilmadi' });
        }

        // Oldingi mahsulotlarni qaytarish va zaxirani yangilash
        for (let item of rental.borrowedProducts) {
            const product = await Product.findById(item.product);
            const newQuantity = product.quantity + item.quantity;
            await Product.findByIdAndUpdate(
                item.product,
                { 
                    quantity: newQuantity,
                    isAvailable: true 
                },
                { new: true }
            );
        }

        // Yangi mahsulotlarni qo'shamiz
        let totalCost = 0;

        for (let item of borrowedProducts) {
            const product = await Product.findById(item.product);

            if (!product || product.quantity < item.quantity) {
                return res.status(400).json({
                    message: `Mahsulot mavjud emas yoki yetarli miqdorda emas: ${product.name}`,
                });
            }

            const newQuantity = product.quantity - item.quantity;
            await Product.findByIdAndUpdate(
                item.product,
                { 
                    quantity: newQuantity,
                    isAvailable: newQuantity > 0 
                },
                { new: true }
            );

            const days = Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24));
            totalCost += product.dailyRate * days * item.quantity;
        }

        // Ijarani yangilaymiz
        rental.borrowedProducts = borrowedProducts;
        rental.startDate = startDate || rental.startDate;
        rental.endDate = endDate || rental.endDate;
        rental.car = car || rental.car;
        rental.totalCost = totalCost;
        rental.debt = totalCost; // Update debt

        await rental.save();
        res.status(200).json({ message: 'Ijara muvaffaqiyatli yangilandi', rental });
    } catch (error) {
        res.status(500).json({ message: 'Ijara yangilashda xatolik yuz berdi', error });
    }
};


// Ijara o'chirish
exports.deleteRental = async (req, res) => {
    try {
        const { id } = req.params;

        const rental = await Rental.findByIdAndDelete(id);

        if (!rental) {
            return res.status(404).json({ message: 'Ijara topilmadi' });
        }

        res.status(200).json({ message: 'Ijara o‘chirildi' });
    } catch (error) {
        res.status(500).json({ message: 'Ijara o‘chirishda xatolik yuz berdi', error });
    }
};
