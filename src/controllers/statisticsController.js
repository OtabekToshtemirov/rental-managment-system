const Rental = require('../models/Rental');
const Customer = require('../models/Customer');
const Car = require('../models/Car');
const Payment = require('../models/Payments');
const moment = require('moment');

// Helper function for sending responses
const sendResponse = (res, data = null, error = null, status = 200) => {
    if (error) {
        return res.status(status).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
    return res.status(status).json({
        success: true,
        data
    });
};

// Get daily revenue statistics
const getDailyRevenue = async (req, res) => {
    try {
        const date = req.query.date ? moment(req.query.date).startOf('day') : moment().startOf('day');
        const endDate = moment(date).endOf('day');

        const dailyStats = await Payment.aggregate([
            {
                $match: {
                    createdAt: { $gte: date.toDate(), $lte: endDate.toDate() }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = dailyStats[0] || { totalAmount: 0, count: 0 };
        delete stats._id;

        sendResponse(res, {
            date: date.format('YYYY-MM-DD'),
            stats
        });
    } catch (error) {
        sendResponse(res, null, error, 500);
    }
};

// Get weekly revenue statistics
const getWeeklyRevenue = async (req, res) => {
    try {
        const startDate = moment().startOf('week');
        const endDate = moment().endOf('week');

        const weeklyStats = await Payment.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%U", date: "$createdAt" } },
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = weeklyStats[0] || { totalAmount: 0, count: 0 };
        delete stats._id;

        sendResponse(res, {
            weekStart: startDate.format('YYYY-MM-DD'),
            weekEnd: endDate.format('YYYY-MM-DD'),
            stats
        });
    } catch (error) {
        sendResponse(res, null, error, 500);
    }
};

// Get monthly revenue statistics
const getMonthlyRevenue = async (req, res) => {
    try {
        const startDate = moment().startOf('month');
        const endDate = moment().endOf('month');

        const monthlyStats = await Payment.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = monthlyStats[0] || { totalAmount: 0, count: 0 };
        delete stats._id;

        sendResponse(res, {
            month: startDate.format('YYYY-MM'),
            stats
        });
    } catch (error) {
        sendResponse(res, null, error, 500);
    }
};

// Get yearly revenue statistics
const getYearlyRevenue = async (req, res) => {
    try {
        const startDate = moment().startOf('year');
        const endDate = moment().endOf('year');

        const yearlyStats = await Payment.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y", date: "$createdAt" } },
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const stats = yearlyStats[0] || { totalAmount: 0, count: 0 };
        delete stats._id;

        sendResponse(res, {
            year: startDate.format('YYYY'),
            stats
        });
    } catch (error) {
        sendResponse(res, null, error, 500);
    }
};

// Get top 5 customers by payment
const getTopCustomers = async (req, res) => {
    try {
        const startDate = moment().startOf('month');
        const endDate = moment().endOf('month');

        const topCustomers = await Payment.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() }
                }
            },
            {
                $group: {
                    _id: "$customer",
                    totalAmount: { $sum: "$amount" },
                    paymentCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "customers",
                    localField: "_id",
                    foreignField: "_id",
                    as: "customerInfo"
                }
            },
            { $unwind: "$customerInfo" },
            {
                $project: {
                    _id: 1,
                    totalAmount: 1,
                    paymentCount: 1,
                    customerName: "$customerInfo.name",
                    customerPhone: "$customerInfo.phone"
                }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 5 }
        ]);

        sendResponse(res, topCustomers);
    } catch (error) {
        sendResponse(res, null, error, 500);
    }
};

// Get most rented cars
const getMostRentedCars = async (req, res) => {
    try {
        const mostRentedCars = await Car.aggregate([
            {
                $sort: { rentalCount: -1 }
            },
            {
                $limit: 5
            },
            {
                $project: {
                    _id: { $toString: "$_id" },
                    carNumber: 1,
                    driverName: 1,
                    driverPhone: 1,
                    rentalCount: 1,
                    createdAt: 1,
                    updatedAt: 1,
                }
            }
        ]);

        sendResponse(res, mostRentedCars);
    } catch (error) {
        sendResponse(res, null, error, 500);
    }
};

module.exports = {
    getDailyRevenue,
    getWeeklyRevenue,
    getMonthlyRevenue,
    getYearlyRevenue,
    getTopCustomers,
    getMostRentedCars
};
