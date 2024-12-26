const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');

// Create a new car
router.post('/', carController.createCar);

// Get all cars
router.get('/', carController.getAllCars);

// Get top rented cars
router.get('/top-rented', carController.getTopRentedCars);

// Get specific car
router.get('/:id', carController.getCarById);

// Update car
router.put('/:id', carController.updateCar);

// Delete car
router.delete('/:id', carController.deleteCar);

module.exports = router;
