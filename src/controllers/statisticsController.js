const Rental = require('../models/Rental');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Payment = require('../models/Payments');
const moment = require('moment');

// Constants for date formats and limits
const DATE_FORMAT = 'YYYY-MM-DD';
const DEFAULT_TOP_LIMIT = 5;
const CACHE_TTL = 300; // 5 minutes in seconds

// Response handler with status codes
const sendResponse = (res, data = null, error = null, status = 200) => {
    if (error) {
        console.error('Statistics Error:', error);
        return res.status(status).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
    return res.status(status).json({
        success: true,
        data
    });
};

// Date range validator and parser
const parseDateRange = (query = {}) => {
    try {
        const now = moment();
        let startDate, endDate;

        // Handle empty or invalid dates by using defaults
        if (!query.startDate || !moment(query.startDate, DATE_FORMAT).isValid()) {
            startDate = now.clone().startOf('month');
        } else {
            startDate = moment(query.startDate, DATE_FORMAT);
        }

        if (!query.endDate || !moment(query.endDate, DATE_FORMAT).isValid()) {
            endDate = now.clone().endOf('day');
        } else {
            endDate = moment(query.endDate, DATE_FORMAT).endOf('day');
        }

        // Ensure end date is not before start date
        if (endDate.isBefore(startDate)) {
            endDate = startDate.clone().endOf('day');
        }

        return {
            startDate: startDate.toDate(),
            endDate: endDate.toDate()
        };
    } catch (error) {
        // Return default date range on error
        const now = moment();
        return {
            startDate: now.clone().startOf('month').toDate(),
            endDate: now.clone().endOf('day').toDate()
        };
    }
};

// Overview Statistics
exports.getOverviewStats = async (req, res) => {
    try {
        const now = moment();
        const periods = {
            today: { 
                start: now.clone().startOf('day'), 
                end: now.clone().endOf('day') 
            },
            yesterday: { 
                start: now.clone().subtract(1, 'day').startOf('day'),
                end: now.clone().subtract(1, 'day').endOf('day')
            },
            thisWeek: { 
                start: now.clone().startOf('week'), 
                end: now.clone().endOf('day') 
            },
            thisMonth: { 
                start: now.clone().startOf('month'), 
                end: now.clone().endOf('day') 
            },
            thisYear: { 
                start: now.clone().startOf('year'), 
                end: now.clone().endOf('day') 
            }
        };

        const [revenue, rentals, customers] = await Promise.all([
            // Revenue statistics
            Payment.aggregate([
                {
                    $facet: Object.entries(periods).reduce((acc, [key, { start, end }]) => ({
                        ...acc,
                        [key]: [
                            { 
                                $match: { 
                                    createdAt: { 
                                        $gte: start.toDate(), 
                                        $lte: end.toDate() 
                                    } 
                                } 
                            },
                            { 
                                $group: { 
                                    _id: null, 
                                    total: { $sum: '$amount' } 
                                } 
                            }
                        ]
                    }), {})
                }
            ]),
            // Rental statistics
            Rental.aggregate([
                {
                    $facet: Object.entries(periods).reduce((acc, [key, { start, end }]) => ({
                        ...acc,
                        [key]: [
                            { 
                                $match: { 
                                    createdAt: { 
                                        $gte: start.toDate(), 
                                        $lte: end.toDate() 
                                    } 
                                } 
                            },
                            { 
                                $group: { 
                                    _id: null, 
                                    count: { $sum: 1 } 
                                } 
                            }
                        ]
                    }), {})
                }
            ]),
            // Active customers count
            Customer.countDocuments({ active: true })
        ]);

        const overview = {
            revenue: Object.entries(periods).reduce((acc, [key]) => ({
                ...acc,
                [key]: revenue[0]?.[key]?.[0]?.total || 0
            }), {}),
            rentals: Object.entries(periods).reduce((acc, [key]) => ({
                ...acc,
                [key]: rentals[0]?.[key]?.[0]?.count || 0
            }), {}),
            activeCustomers: customers || 0
        };

        sendResponse(res, overview);
    } catch (error) {
        sendResponse(res, null, error, 500);
    }
};

// Revenue Statistics with dynamic time grouping
const getRevenueStats = async (groupBy, dateRange) => {
    const groupings = {
        daily: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        weekly: { $week: '$createdAt' },
        monthly: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
        },
        yearly: { $year: '$createdAt' }
    };

    const matchStage = {
        $match: {
            createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
    };

    const groupStage = {
        $group: {
            _id: groupings[groupBy],
            revenue: { $sum: '$amount' },
            count: { $sum: 1 },
            avgTransaction: { $avg: '$amount' }
        }
    };

    return Payment.aggregate([
        matchStage,
        groupStage,
        { $sort: { '_id': 1 } }
    ]);
};

// Generate time-based revenue endpoints
['Daily', 'Weekly', 'Monthly', 'Yearly'].forEach(period => {
    exports[`get${period}Revenue`] = async (req, res) => {
        try {
            const dateRange = parseDateRange(req.query);
            const stats = await getRevenueStats(period.toLowerCase(), dateRange);
            sendResponse(res, stats);
        } catch (error) {
            sendResponse(res, null, error, 500);
        }
    };
});

// Top Customers Statistics
exports.getTopCustomers = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || DEFAULT_TOP_LIMIT, 50);
        const dateRange = parseDateRange(req.query);

        const stats = await Customer.aggregate([
            {
                $lookup: {
                    from: 'payments',
                    let: { customerId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$customer', '$$customerId'] },
                                        { $gte: ['$createdAt', dateRange.startDate] },
                                        { $lte: ['$createdAt', dateRange.endDate] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'payments'
                }
            },
            {
                $project: {
                    name: 1,
                    phone: 1,
                    email: 1,
                    address: 1,
                    balance: 1,
                    totalSpent: { $sum: '$payments.amount' },
                    averageTransaction: { $avg: '$payments.amount' },
                    transactionCount: { $size: '$payments' },
                    lastTransaction: { $max: '$payments.createdAt' }
                }
            },
            { $match: { totalSpent: { $gt: 0 } } },
            { $sort: { totalSpent: -1 } },
            { $limit: limit }
        ]);

        sendResponse(res, stats);
    } catch (error) {
        sendResponse(res, null, error, 500);
    }
};

// Customer History
exports.getCustomerHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const dateRange = parseDateRange(req.query);

        const history = await Payment.aggregate([
            {
                $match: {
                    customer: id,
                    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                }
            },
            {
                $lookup: {
                    from: 'rentals',
                    localField: 'rental',
                    foreignField: '_id',
                    as: 'rentalDetails'
                }
            },
            {
                $unwind: '$rentalDetails'
            },
            {
                $project: {
                    date: '$createdAt',
                    amount: 1,
                    rentalId: '$rental',
                    products: '$rentalDetails.products',
                    status: '$rentalDetails.status'
                }
            },
            { $sort: { date: -1 } }
        ]);

        sendResponse(res, history);
    } catch (error) {
        sendResponse(res, null, error, 500);
    }
};

// Most Rented Products
exports.getMostRentedProducts = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || DEFAULT_TOP_LIMIT, 50);
        const dateRange = parseDateRange(req.query);

        const stats = await Rental.aggregate([
            {
                $match: {
                    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
                }
            },
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$products.product',
                    productName: { $first: '$productDetails.name' },
                    category: { $first: '$productDetails.category' },
                    totalRentals: { $sum: 1 },
                    totalRevenue: { $sum: '$products.price' },
                    averageRentalDuration: {
                        $avg: {
                            $divide: [
                                { $subtract: ['$returnDate', '$startDate'] },
                                1000 * 60 * 60 * 24 // Convert to days
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    productName: 1,
                    category: 1,
                    totalRentals: 1,
                    totalRevenue: 1,
                    averageRentalDuration: { $round: ['$averageRentalDuration', 1] },
                    revenuePerRental: {
                        $round: [{ $divide: ['$totalRevenue', '$totalRentals'] }, 2]
                    }
                }
            },
            { $sort: { totalRentals: -1 } },
            { $limit: limit }
        ]);

        sendResponse(res, stats);
    } catch (error) {
        sendResponse(res, null, error, 500);
    }
};

// Product Statistics with dynamic time grouping
const getProductStats = async (groupBy, dateRange) => {
    const groupings = {
        daily: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        weekly: { $week: '$createdAt' },
        monthly: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
        },
        yearly: { $year: '$createdAt' }
    };

    return Rental.aggregate([
        {
            $match: {
                createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
            }
        },
        { $unwind: '$products' },
        {
            $group: {
                _id: groupings[groupBy],
                totalRentals: { $sum: 1 },
                totalRevenue: { $sum: '$products.price' },
                uniqueProducts: { $addToSet: '$products.product' }
            }
        },
        {
            $project: {
                totalRentals: 1,
                totalRevenue: 1,
                uniqueProductCount: { $size: '$uniqueProducts' },
                averageRevenuePerRental: {
                    $round: [{ $divide: ['$totalRevenue', '$totalRentals'] }, 2]
                }
            }
        },
        { $sort: { '_id': 1 } }
    ]);
};

// Generate time-based product endpoints
['Daily', 'Weekly', 'Monthly', 'Yearly'].forEach(period => {
    exports[`get${period}ProductStats`] = async (req, res) => {
        try {
            const dateRange = parseDateRange(req.query);
            const stats = await getProductStats(period.toLowerCase(), dateRange);
            sendResponse(res, stats);
        } catch (error) {
            sendResponse(res, null, error, 500);
        }
    };
});
