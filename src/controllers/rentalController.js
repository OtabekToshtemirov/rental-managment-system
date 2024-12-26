const Rental = require('../models/Rental');
const Product = require('../models/Product');

// Mahsulot ijaraga olish
exports.createRental = async (req, res) => {
    try {
        const { customer, car, borrowedProducts, startDate } = req.body;

        let totalCost = 0;

        // Validate all products first before making any changes
        for (let item of borrowedProducts) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(400).json({ message: `Mahsulot topilmadi: ${item.product}` });
            }
            if (product.quantity < item.quantity) {
                return res.status(400).json({ 
                    message: `Mahsulot yetarli miqdorda emas: ${product.name}`,
                    available: product.quantity,
                    requested: item.quantity
                });
            }
        }

        // Update products and calculate total cost
        const productUpdates = [];
        for (let item of borrowedProducts) {
            const product = await Product.findById(item.product);
            
            const days = Math.ceil((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24));
            totalCost += product.dailyRate * days * item.quantity;

            // Store update operation
            productUpdates.push({
                updateOne: {
                    filter: { _id: product._id },
                    update: { 
                        $inc: { quantity: -item.quantity },
                        $set: { isAvailable: (product.quantity - item.quantity) > 0 }
                    }
                }
            });
        }

        // Create rental first
        const rental = new Rental({
            customer,
            car,
            borrowedProducts,
            startDate: new Date(startDate),
            totalCost,
            status: 'active'
        });

        await rental.save();

        // Then update all products in bulk
        await Product.bulkWrite(productUpdates);

        res.status(201).json(rental);
    } catch (error) {
        res.status(500).json({ message: 'Ijara yaratishda xatolik yuz berdi', error });
    }
};
//get all rentals
exports.getAllRentals = async (req, res) => {
    try {
        const rentals = await Rental.find()
            .populate('customer')
            .populate('car')
            .populate('borrowedProducts.product')
            .populate('returnedProducts.product');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: 'Ijaralarni olishda xatolik yuz berdi', error });
    }
};

// Ijara olish
exports.getRentalById = async (req, res) => {
    try {
        const rental = await Rental.findById(req.params.id).populate('customer car');
        if (!rental) {
            return res.status(404).json({ message: 'Ijara topilmadi' });
        }
        res.json(rental);
    } catch (error) {
        res.status(500).json({ message: 'Ijarani olishda xatolik yuz berdi', error });
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

// get rentals by customer id
exports.getRentalsByCustomerId = async (req, res) => {
    try {
        const rentals = await Rental.find({ customer: req.params.customerId }).populate('customer car');
        res.json(rentals);
    } catch (error) {
        res.status(500).json({ message: 'Ijaralarni olishda xatolik yuz berdi', error });
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

// Mahsulotlarni qaytarish
exports.returnProduct = async (req, res) => {
    try {
        const { rentalId, returnedProducts } = req.body;

        const rental = await Rental.findById(rentalId).populate('borrowedProducts.product');

        if (!rental) {
            return res.status(404).json({ message: 'Ijara topilmadi' });
        }

        for (let returned of returnedProducts) {
            const borrowed = rental.borrowedProducts.find(bp => bp.product.equals(returned.product));

            if (!borrowed || borrowed.quantity < returned.quantity) {
                return res.status(400).json({ message: `Qaytarilayotgan mahsulot miqdori noto‘g‘ri: ${borrowed.product.name}` });
            }

            const product = await Product.findById(returned.product);
            const days = Math.ceil((new Date(returned.returnDate) - new Date(borrowed.startDate)) / (1000 * 60 * 60 * 24));
            const cost = days * product.dailyRate * returned.quantity;

            product.quantity += returned.quantity;
            product.isAvailable = true;
            await product.save();

            rental.returnedProducts.push({
                ...returned,
                cost,
            });

            borrowed.quantity -= returned.quantity;
        }

        rental.totalCost += rental.returnedProducts.reduce((acc, rp) => acc + rp.cost, 0);
        rental.status = rental.borrowedProducts.every(bp => bp.quantity === 0) ? 'completed' : 'active';

        await rental.save();
        res.status(200).json(rental);
    } catch (error) {
        res.status(500).json({ message: 'Mahsulotlarni qaytarishda xatolik yuz berdi', error });
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
