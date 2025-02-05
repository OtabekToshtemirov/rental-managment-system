const Expense = require('../models/Expense');

// Create new expense
exports.createExpense = async (req, res) => {
    try {
        const { title, description, amount, category, paymentMethod, date } = req.body;
        
        const expense = new Expense({
            description,
            amount,
            category,
            paymentMethod,
            date: date || new Date()
        });

        await expense.save();

        res.status(201).json({
            message: 'Harajat muvaffaqiyatli qo\'shildi',
            expense
        });
    } catch (error) {
        res.status(500).json({
            message: 'Harajat qo\'shishda xatolik yuz berdi',
            error: error.message
        });
    }
};

// Get all expenses
exports.getAllExpenses = async (req, res) => {
    try {
        const { startDate, endDate, category, paymentMethod } = req.query;
        
        const query = {};
        
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        if (category && category !== 'all') {
            query.category = category;
        }
        
        if (paymentMethod && paymentMethod !== 'all') {
            query.paymentMethod = paymentMethod;
        }

        const expenses = await Expense.find(query)
            .sort({ date: -1, createdAt: -1 });
            
        res.json(expenses);
    } catch (error) {
        res.status(500).json({
            message: 'Harajatlarni olishda xatolik yuz berdi',
            error: error.message
        });
    }
};

// Get expense by ID
exports.getExpenseById = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
            
        if (!expense) {
            return res.status(404).json({ message: 'Harajat topilmadi' });
        }
        
        res.json(expense);
    } catch (error) {
        res.status(500).json({
            message: 'Harajatni olishda xatolik yuz berdi',
            error: error.message
        });
    }
};

// Update expense
exports.updateExpense = async (req, res) => {
    try {
        const { title, description, amount, category, paymentMethod, date } = req.body;
        
        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            { title, description, amount, category, paymentMethod, date },
            { new: true, runValidators: true }
        );

        if (!expense) {
            return res.status(404).json({ message: 'Harajat topilmadi' });
        }

        res.json({
            message: 'Harajat muvaffaqiyatli yangilandi',
            expense
        });
    } catch (error) {
        res.status(500).json({
            message: 'Harajatni yangilashda xatolik yuz berdi',
            error: error.message
        });
    }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        
        if (!expense) {
            return res.status(404).json({ message: 'Harajat topilmadi' });
        }

        res.json({
            message: 'Harajat muvaffaqiyatli o\'chirildi',
            expense
        });
    } catch (error) {
        res.status(500).json({
            message: 'Harajatni o\'chirishda xatolik yuz berdi',
            error: error.message
        });
    }
};

// Get expense statistics
exports.getExpenseStats = async (req, res) => {
    try {
        const { startDate, endDate, groupBy = 'category' } = req.query;
        
        const matchStage = {};
        if (startDate && endDate) {
            matchStage.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const groupStage = {
            $group: {
                _id: `$${groupBy}`,
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 },
                avgAmount: { $avg: '$amount' }
            }
        };

        const stats = await Expense.aggregate([
            { $match: matchStage },
            groupStage,
            {
                $project: {
                    category: '$_id',
                    totalAmount: 1,
                    count: 1,
                    avgAmount: { $round: ['$avgAmount', 2] },
                    _id: 0
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        // Get monthly totals if date range is provided
        let monthlyStats = [];
        if (startDate && endDate) {
            monthlyStats = await Expense.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' },
                            month: { $month: '$date' }
                        },
                        totalAmount: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);
        }

        // Get overall totals
        const total = await Expense.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalExpenses: { $sum: '$amount' },
                    totalCount: { $sum: 1 },
                    avgExpense: { $avg: '$amount' }
                }
            },
            {
                $project: {
                    totalExpenses: 1,
                    totalCount: 1,
                    avgExpense: { $round: ['$avgExpense', 2] },
                    _id: 0
                }
            }
        ]);

        res.json({
            groupedStats: stats,
            monthlyStats: monthlyStats,
            overall: total[0] || { totalExpenses: 0, totalCount: 0, avgExpense: 0 }
        });
    } catch (error) {
        res.status(500).json({
            message: 'Statistikani olishda xatolik yuz berdi',
            error: error.message
        });
    }
};
