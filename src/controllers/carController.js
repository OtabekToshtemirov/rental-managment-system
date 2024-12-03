const Car = require('../models/Car');
const mongoose = require('mongoose');

// Create a new car
exports.createCar = async (req, res) => {
    try {
        const car = await Car.create(req.body);
        res.status(201).json({
            success: true,
            data: car
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Bu mashina raqami yoki davlat raqami allaqachon mavjud'
            });
        }
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all cars
exports.getAllCars = async (req, res) => {
    try {
        const cars = await Car.find();
        res.status(200).json({
            success: true,
            count: cars.length,
            data: cars
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Serverda xatolik yuz berdi"
        });
    }
};

// Get car by ID
exports.getCarById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Noto\'g\'ri ID formati'
            });
        }

        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({
                success: false,
                message: 'Mashina topilmadi'
            });
        }

        res.status(200).json({
            success: true,
            data: car
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Serverda xatolik yuz berdi"
        });
    }
};

// Update car
exports.updateCar = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Noto\'g\'ri ID formati'
            });
        }

        const car = await Car.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!car) {
            return res.status(404).json({
                success: false,
                message: 'Mashina topilmadi'
            });
        }

        res.status(200).json({
            success: true,
            data: car
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Bu mashina raqami yoki davlat raqami allaqachon mavjud'
            });
        }
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Delete car
exports.deleteCar = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Noto\'g\'ri ID formati'
            });
        }

        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({
                success: false,
                message: 'Mashina topilmadi'
            });
        }

        await car.deleteOne();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get top rented cars
exports.getTopRentedCars = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        if (limit < 1) {
            return res.status(400).json({
                success: false,
                message: 'Limit 1 dan katta bo\'lishi kerak'
            });
        }

        const cars = await Car.find()
            .sort({ rentalCount: -1 })
            .limit(limit);

        res.status(200).json({
            success: true,
            count: cars.length,
            data: cars
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Serverda xatolik yuz berdi"
        });
    }
};

// Update car rental count
exports.updateCarRental = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Noto\'g\'ri ID formati'
            });
        }

        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({
                success: false,
                message: 'Mashina topilmadi'
            });
        }

        car.rentalCount = (car.rentalCount || 0) + 1;
        await car.save();

        res.status(200).json({
            success: true,
            data: car
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get car statistics
exports.getCarStatistics = async (req, res) => {
    try {
        const [totalStats, brandStats, yearStats, availabilityStats] = await Promise.all([
            // Total statistics
            Car.aggregate([
                {
                    $group: {
                        _id: null,
                        totalCars: { $sum: 1 },
                        totalRentals: { $sum: '$rentalCount' },
                        averageRentals: { $avg: '$rentalCount' },
                        averageDailyRate: { $avg: '$dailyRate' },
                        totalRevenue: { $sum: { $multiply: ['$dailyRate', '$rentalCount'] } }
                    }
                }
            ]),

            // Statistics by brand
            Car.aggregate([
                {
                    $group: {
                        _id: '$brand',
                        count: { $sum: 1 },
                        totalRentals: { $sum: '$rentalCount' },
                        averageRentals: { $avg: '$rentalCount' },
                        averageDailyRate: { $avg: '$dailyRate' }
                    }
                },
                { $sort: { count: -1 } }
            ]),

            // Statistics by year
            Car.aggregate([
                {
                    $group: {
                        _id: '$year',
                        count: { $sum: 1 },
                        totalRentals: { $sum: '$rentalCount' },
                        averageRentals: { $avg: '$rentalCount' },
                        averageDailyRate: { $avg: '$dailyRate' }
                    }
                },
                { $sort: { _id: -1 } }
            ]),

            // Statistics by availability
            Car.aggregate([
                {
                    $group: {
                        _id: '$isAvailable',
                        count: { $sum: 1 },
                        averageDailyRate: { $avg: '$dailyRate' }
                    }
                }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                overall: totalStats[0] || {
                    totalCars: 0,
                    totalRentals: 0,
                    averageRentals: 0,
                    averageDailyRate: 0,
                    totalRevenue: 0
                },
                byBrand: brandStats,
                byYear: yearStats,
                byAvailability: availabilityStats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Serverda xatolik yuz berdi"
        });
    }
};
