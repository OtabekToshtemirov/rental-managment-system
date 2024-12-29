const { body, validationResult } = require('express-validator');

exports.validateRental = [
    body('customer')
        .isMongoId().withMessage('Mijozning ID si noto\'g\'ri'),
    body('startDate')
        .isISO8601().withMessage('Boshlanish sanasi noto\'g\'ri'),
    body('endDate')
        .isISO8601().withMessage('Tugash sanasi noto\'g\'ri')
        .custom((endDate, { req }) => {
            if (new Date(endDate) <= new Date(req.body.startDate)) {
                throw new Error('Tugash sanasi boshlanish sanasidan keyin bo\'lishi kerak');
            }
            return true;
        }),
    body('borrowedProducts')
        .isArray().withMessage('Ijara olingan mahsulotlar massiv bo\'lishi kerak'),
    body('borrowedProducts.*.product')
        .isMongoId().withMessage('Ijara olingan mahsulot ID noto\'g\'ri'),
    body('borrowedProducts.*.quantity')
        .isInt({ min: 1 }).withMessage('Ijara mahsulot miqdori kamida 1 bo\'lishi kerak'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
exports.validateProducts = [
    body('product')
        .isMongoId().withMessage('Mahsulot ID noto\'g\'ri'),
    body('quantity')
        .isInt({ min: 1 }).withMessage('Mahsulot miqdori kamida 1 bo\'lishi kerak'),
    body('returnDate')
        .optional().isISO8601().withMessage('Qaytarish sanasi noto\'g\'ri formatda'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
exports.validateExpense = [
    body('amount')
        .isFloat({ min: 0 }).withMessage('Summa 0 dan katta bo\'lishi kerak'),
    body('category')
        .isIn(['maosh','elektr', 'suv', 'transport', 'boshqa', 'soliq', 'xaridlar', 'tamir'])
        .withMessage('Kategoriya noto\'g\'ri'),
    body('paymentMethod')
        .isIn(['karta', 'naqd']).withMessage('To\'lov usuli noto\'g\'ri'),
    body('date')
        .optional().isISO8601().withMessage('Sana noto\'g\'ri formatda'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
