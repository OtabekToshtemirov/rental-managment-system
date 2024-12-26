const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');

router.get('/revenue/daily', statisticsController.getDailyRevenue);
router.get('/revenue/weekly', statisticsController.getWeeklyRevenue);
router.get('/revenue/monthly', statisticsController.getMonthlyRevenue);
router.get('/revenue/yearly', statisticsController.getYearlyRevenue);
router.get('/customers/top', statisticsController.getTopCustomers);
router.get('/cars/most-rented', statisticsController.getMostRentedCars);

module.exports = router;
