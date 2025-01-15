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

        // Muhim maydonlarni tekshirish
        if (!rentalData.workStartDate) {
            return res.status(400).json({ message: 'Ish boshlanish sanasi kiritilishi shart' });
        }

        if (!rentalData.totalCost || isNaN(rentalData.totalCost)) {
            return res.status(400).json({ message: 'Umumiy summa noto\'g\'ri kiritilgan' });
        }

        // Oldindan to'lov tekshiruvi
        if (rentalData.prepaidAmount) {
            const prepaidAmount = parseFloat(rentalData.prepaidAmount);
            if (isNaN(prepaidAmount) || prepaidAmount < 0) {
                return res.status(400).json({ message: 'Oldindan to\'lov summasi noto\'g\'ri' });
            }
            if (prepaidAmount > rentalData.totalCost) {
                return res.status(400).json({ message: 'Oldindan to\'lov umumiy summadan oshib ketdi' });
            }
        }

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
            // Find the length of rentals 
            const rentals = await Rental.find().sort({ createdAt: -1 });
            rentalNumber = rentals.length + 1;
        } catch (error) {
            console.error('Error generating rental number:', error);
            return res.status(500).json({ 
                message: 'Ijara raqamini yaratishda xatolik',
                details: error.message 
            });
        }

        // add prepaid payment if provided
        if (rentalData.prepaidAmount && parseFloat(rentalData.prepaidAmount) > 0) {
            const prepaidAmount = parseFloat(rentalData.prepaidAmount);
            
            const payment = new Payment({
                customer: rentalData.customer,
                rental: rental._id,
                amount: prepaidAmount,
                paymentType: rentalData.paymentType || 'cash',
                paymentDate: new Date(),
                isPrepaid: true,
                description: 'Oldindan to\'lov'
            });
            
            await payment.save();

            // Qarzni yangilash
            rental.debt = rental.totalCost - prepaidAmount;
            rental.payments = [payment._id]; // To'lovlar ro'yxatini saqlash
            await rental.save();
        }

        // Har bir mahsulot uchun miqdorini tekshirish va kamaytirish
        const productUpdates = [];
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

            // O'zgarishlarni to'plash
            productUpdates.push({
                updateOne: {
                    filter: { _id: product._id },
                    update: {
                         $inc: { quantity: -item.quantity } ,
                        $inc: { rented: item.quantity }
                        }
                }
            });
        }

        // Barcha mahsulotlarni bir vaqtda yangilash
        if (productUpdates.length > 0) {
            await Product.bulkWrite(productUpdates);
        }

        //ijara mashinasi rentalCount ni bittaga oshirish
        if (rentalData.car) {
            const car = await Car.findById(rentalData.car);
            if (car) {
                car.rentalCount += 1;
                await car.save();
            }
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

        // Populate the rental data
        const populatedRental = await Rental.findById(rental._id)
            .populate('customer')
            .populate({
                path: 'borrowedProducts.product',
                populate: {
                    path: 'parts.product',
                    model: 'Product',
                    select: 'name type dailyRate'
                }
            })
            .populate('car');

        res.status(201).json(populatedRental);
    } catch (error) {
        console.error('Ijara yaratishda xatolik:', error);
        
        let errorMessage = 'Ijarani yaratishda xatolik yuz berdi';
        let statusCode = 500;

        if (error.name === 'ValidationError') {
            errorMessage = 'Ma\'lumotlar noto\'g\'ri kiritilgan';
            statusCode = 400;
        } else if (error.name === 'MongoError' && error.code === 11000) {
            errorMessage = 'Bu ijara raqami allaqachon mavjud';
            statusCode = 409;
        }

        res.status(statusCode).json({ 
            message: errorMessage,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
            .populate({
                path: 'borrowedProducts.product',
                populate: {
                    path: 'parts.product',
                    model: 'Product',
                    select: 'name type dailyRate'
                }
            })
            .populate({
                path: 'returnedProducts.product',
                populate: {
                    path: 'parts.product',
                    model: 'Product',
                    select: 'name type dailyRate'
                }
            });

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
            .populate('car')
            .populate({
                path: 'borrowedProducts.product',
                populate: {
                    path: 'parts.product',
                    model: 'Product',
                    select: 'name type dailyRate'
                }
            })
            .populate({
                path: 'returnedProducts.product',
                populate: {
                    path: 'parts.product',
                    model: 'Product',
                    select: 'name type dailyRate'
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
            .populate({
                path: 'borrowedProducts.product',
                populate: {
                    path: 'parts.product',
                    model: 'Product',
                    select: 'name type dailyRate'
                }
            })
            .populate({
                path: 'returnedProducts.product',
                populate: {
                    path: 'parts.product',
                    model: 'Product',
                    select: 'name type dailyRate'
                }
            })
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
        const { products: returnedProducts } = req.body;

        if (!Array.isArray(returnedProducts) || returnedProducts.length === 0) {
            return res.status(400).json({ message: 'No products to process for return' });
        }

        const rental = await Rental.findById(rentalId);
        if (!rental) return res.status(404).json({ message: 'Rental not found' });

        let totalReturnAmount = 0;

        // Validate all products first
        for (const item of returnedProducts) {
            const { product, quantity } = item;
            
            // Find borrowed product
            const borrowedProduct = rental.borrowedProducts.find(
                bp => bp.product.toString() === product
            );
            if (!borrowedProduct) {
                throw new Error(`Product ${product} not found in rental`);
            }

            // Calculate total returned quantity including this return
            const alreadyReturnedQuantity = rental.returnedProducts
                .filter(rp => rp.product.toString() === product)
                .reduce((sum, rp) => sum + rp.quantity, 0);

            // Check if return quantity exceeds remaining quantity
            const remainingQuantity = borrowedProduct.quantity - alreadyReturnedQuantity;
            if (quantity > remainingQuantity) {
                throw new Error(`Cannot return more than borrowed quantity for product ${product}. Remaining: ${remainingQuantity}, Attempted: ${quantity}`);
            }
        }

        // Process returns after validation
        for (const item of returnedProducts) {
            const { product, quantity, returnDate, discountDays = 0, dailyRate } = item;

            const borrowedProduct = rental.borrowedProducts.find(
                bp => bp.product.toString() === product
            );

            const startDate = new Date(borrowedProduct.startDate);
            const calculatedReturnDate = new Date(returnDate);
            const days = Math.max(
                1,
                Math.ceil((calculatedReturnDate - startDate) / (1000 * 60 * 60 * 24))
            );
            const effectiveDays = Math.max(1, days - discountDays);
            const cost = effectiveDays * (dailyRate || borrowedProduct.dailyRate) * quantity;

            totalReturnAmount += cost;

            // Update inventory
            await Product.findByIdAndUpdate(product, { $inc: { quantity } , $inc: { rented: -quantity } });

            // Add returned product record
            rental.returnedProducts.push({
                product,
                quantity,
                startDate,
                returnDate: calculatedReturnDate,
                dailyRate: dailyRate || borrowedProduct.dailyRate,
                discountDays,
                totalCost: cost,
                days: effectiveDays
            });
        }

        // Update rental total cost and discount
        rental.totalCost = (rental.totalCost || 0) + totalReturnAmount;
        rental.totalDiscount = rental.totalDiscount || 0;

        // Update customer balance
        const customer = await Customer.findById(rental.customer);
        if (customer) {
            customer.balance = (customer.balance || 0) - totalReturnAmount;
            await customer.save();
        }

        // Check if all products are returned
        const allReturned = rental.borrowedProducts.every(bp => {
            const returnedQty = rental.returnedProducts
                .filter(rp => rp.product.toString() === bp.product.toString())
                .reduce((sum, rp) => sum + rp.quantity, 0);
            return returnedQty >= bp.quantity;
        });

        if (allReturned) {
            rental.status = 'completed';
            rental.endDate = new Date();
        }

        await rental.save();

        res.status(200).json({
            message: 'Products returned successfully',
            rental,
            totalReturnAmount
        });
    } catch (error) {
        console.error('Return process error:', error);
        res.status(500).json({ message: error.message || 'Error during return process' });
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
                    model: 'Product',
                    select: 'name type dailyRate'
                }
            })
            .populate({
                path: 'returnedProducts.product',
                populate: {
                    path: 'parts.product',
                    model: 'Product',
                    select: 'name type dailyRate'
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
        .populate({
            path: 'borrowedProducts.product',
            populate: {
                path: 'parts.product',
                model: 'Product',
                select: 'name type dailyRate'
            }
        })
        .populate({
            path: 'returnedProducts.product',
            populate: {
                path: 'parts.product',
                model: 'Product',
                select: 'name type dailyRate'
            }
        })
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
