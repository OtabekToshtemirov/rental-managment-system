const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');

/**
 * @swagger
 * /api/statistics/overview:
 *   get:
 *     summary: Get overview statistics
 *     description: Returns overview statistics including revenue, rentals, and customer counts
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics (YYYY-MM-DD)
 */
router.get('/overview', statisticsController.getOverviewStats);

/**
 * @swagger
 * /api/statistics/revenue/{period}:
 *   get:
 *     summary: Get revenue statistics by period
 *     parameters:
 *       - in: path
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 */
router.get('/revenue/daily', statisticsController.getDailyRevenue);
router.get('/revenue/weekly', statisticsController.getWeeklyRevenue);
router.get('/revenue/monthly', statisticsController.getMonthlyRevenue);
router.get('/revenue/yearly', statisticsController.getYearlyRevenue);

/**
 * @swagger
 * /api/statistics/customers/top:
 *   get:
 *     summary: Get top customers by revenue
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *           maximum: 50
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 */
router.get('/customers/top', statisticsController.getTopCustomers);

/**
 * @swagger
 * /api/statistics/customers/{id}/history:
 *   get:
 *     summary: Get customer rental and payment history
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 */
router.get('/customers/:id/history', statisticsController.getCustomerHistory);

/**
 * @swagger
 * /api/statistics/products/most-rented:
 *   get:
 *     summary: Get most rented products
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *           maximum: 50
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 */
router.get('/products/most-rented', statisticsController.getMostRentedProducts);

/**
 * @swagger
 * /api/statistics/products/{period}:
 *   get:
 *     summary: Get product statistics by period
 *     parameters:
 *       - in: path
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 */
router.get('/products/daily', statisticsController.getDailyProductStats);
router.get('/products/weekly', statisticsController.getWeeklyProductStats);
router.get('/products/monthly', statisticsController.getMonthlyProductStats);
router.get('/products/yearly', statisticsController.getYearlyProductStats);

module.exports = router;
