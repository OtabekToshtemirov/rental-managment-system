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
                message: 'Бу машина рақами аллақачон мавжуд'
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
        const cars = await Car.find()
            .populate({
                path: 'rentals',
                populate: {
                    path: 'customer',
                    select: 'name phone'
                }
            });

        // Separate active and completed rentals
        const carsWithRentalInfo = cars.map(car => {
            const carObj = car.toObject();
            
            // Filter active and completed rentals
            carObj.activeRentals = car.rentals.filter(rental => 
                rental.status === 'active' || rental.status === 'overdue'
            );
            
            carObj.rentalHistory = car.rentals.filter(rental => 
                rental.status === 'completed'
            );

            return carObj;
        });

        res.status(200).json({
            success: true,
            count: cars.length,
            data: carsWithRentalInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Серверда хатолик юз берди"
        });
    }
};

// Get car by ID
exports.getCarById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Нотўғри ID формати'
            });
        }

        const car = await Car.findById(req.params.id)
            .populate({
                path: 'rentals',
                populate: {
                    path: 'customer',
                    select: 'name phone'
                }
            });

        if (!car) {
            return res.status(404).json({
                success: false,
                message: 'Транспорт топилмади'
            });
        }

        // Separate active and completed rentals
        const carObj = car.toObject();
        carObj.activeRentals = car.rentals.filter(rental => 
            rental.status === 'active' || rental.status === 'overdue'
        );
        carObj.rentalHistory = car.rentals.filter(rental => 
            rental.status === 'completed'
        );

        res.status(200).json({
            success: true,
            data: carObj
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Серверда хатолик юз берди"
        });
    }
};

// Update car
exports.updateCar = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Нотўғри ID формати'
            });
        }

        const car = await Car.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        ).populate({
            path: 'rentals',
            populate: {
                path: 'customer',
                select: 'name phone'
            }
        });

        if (!car) {
            return res.status(404).json({
                success: false,
                message: 'Транспорт топилмади'
            });
        }

        // Separate active and completed rentals
        const carObj = car.toObject();
        carObj.activeRentals = car.rentals.filter(rental => 
            rental.status === 'active' || rental.status === 'overdue'
        );
        carObj.rentalHistory = car.rentals.filter(rental => 
            rental.status === 'completed'
        );

        res.status(200).json({
            success: true,
            data: carObj
        });
    } catch (error) {
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
                message: 'Нотўғри ID формати'
            });
        }

        const car = await Car.findById(req.params.id);

        if (!car) {
            return res.status(404).json({
                success: false,
                message: 'Транспорт топилмади'
            });
        }

        // Check if car has active rentals
        const hasActiveRentals = car.rentals.some(rental => 
            rental.status === 'active' || rental.status === 'overdue'
        );

        if (hasActiveRentals) {
            return res.status(400).json({
                success: false,
                message: 'Фаол ижаралари бор транспортни ўчириб бўлмайди'
            });
        }

        await car.remove();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Серверда хатолик юз берди"
        });
    }
};

// Get top rented cars
exports.getTopRentedCars = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const cars = await Car.find()
            .sort({ rentalCount: -1 })
            .limit(limit)
            .populate({
                path: 'rentals',
                populate: {
                    path: 'customer',
                    select: 'name phone'
                }
            });

        const carsWithRentalInfo = cars.map(car => {
            const carObj = car.toObject();
            carObj.activeRentals = car.rentals.filter(rental => 
                rental.status === 'active' || rental.status === 'overdue'
            );
            carObj.rentalHistory = car.rentals.filter(rental => 
                rental.status === 'completed'
            );
            return carObj;
        });

        res.status(200).json({
            success: true,
            count: cars.length,
            data: carsWithRentalInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Серверда хатолик юз берди"
        });
    }
};

// Update car rental count
exports.updateCarRental = async (req, res) => {
    try {
        const { carId, rentalId, action } = req.body;

        if (!mongoose.Types.ObjectId.isValid(carId)) {
            return res.status(400).json({
                success: false,
                message: 'Нотўғри транспорт ID формати'
            });
        }

        const car = await Car.findById(carId);

        if (!car) {
            return res.status(404).json({
                success: false,
                message: 'Транспорт топилмади'
            });
        }

        if (action === 'add') {
            car.rentalCount += 1;
            car.rentals.push(rentalId);
        } else if (action === 'remove') {
            car.rentalCount = Math.max(0, car.rentalCount - 1);
            car.rentals = car.rentals.filter(rental => rental.toString() !== rentalId);
        }

        await car.save();

        res.status(200).json({
            success: true,
            data: car
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Серверда хатолик юз берди"
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
            message: "Серверда хатолик юз берди"
        });
    }
};
