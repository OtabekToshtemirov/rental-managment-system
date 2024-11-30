const Car = require('../models/Car');

// Create a new car
exports.createCar = async (req, res) => {
    try {
        const car = new Car(req.body);
        await car.save();
        res.status(201).json(car);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all cars
exports.getAllCars = async (req, res) => {
    try {
        const cars = await Car.find();
        res.json(cars);
    } catch (error) {
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
    }
};

// Get car by ID
exports.getCarById = async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ message: 'Mashina topilmadi' });
        }
        res.json(car);
    } catch (error) {
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
    }
};

// Update car
exports.updateCar = async (req, res) => {
    try {
        const car = await Car.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!car) {
            return res.status(404).json({ message: 'Mashina topilmadi' });
        }
        res.json(car);
    } catch (error) {
        res.status(400).json({ message: "Ma'lumotlarni yangilashda xatolik", error: error.message });
    }
};

// Delete car
exports.deleteCar = async (req, res) => {
    try {
        const car = await Car.findByIdAndDelete(req.params.id);
        if (!car) {
            return res.status(404).json({ message: 'Mashina topilmadi' });
        }
        res.json({ message: 'Mashina muvaffaqiyatli o\'chirildi' });
    } catch (error) {
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
    }
};

// Get top rented cars
exports.getTopRentedCars = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const cars = await Car.find()
            .sort({ rentalCount: -1 })
            .limit(limit);
        res.json(cars);
    } catch (error) {
        res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message });
    }
};

// Update car rental count
exports.updateCarRental = async (carId) => {
    try {
        const car = await Car.findById(carId);
        if (!car) {
            throw new Error('Mashina topilmadi');
        }
        
        car.rentalCount += 1;
        await car.save();
        
        return car;
    } catch (error) {
        throw error;
    }
};
