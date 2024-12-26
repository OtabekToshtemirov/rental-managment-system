const Rental = require('../models/Rental');
const Expense = require('../models/Expense');

// Generalized middleware to check if a document exists
exports.checkDocumentExists = (model, modelName) => {
    return async (req, res, next) => {
        try {
            const id = req.params.id || req.params[`${modelName.toLowerCase()}Id`];
            if (!id) {
                return res.status(400).json({
                    message: `${modelName} ID ko'rsatilmagan`
                });
            }

            const document = await model.findById(id);

            if (!document) {
                return res.status(404).json({
                    message: `${modelName} ID ${id} bilan topilmadi`
                });
            }

            // Attach document to the request object
            req[modelName.toLowerCase()] = document;
            next();
        } catch (error) {
            res.status(500).json({
                message: `${modelName} mavjudligini tekshirishda xatolik`,
                error: error.message
            });
        }
    };
};

// Specific middlewares using the generalized function
exports.checkRentalExists = exports.checkDocumentExists(Rental, 'Rental');
exports.checkExpenseExists = exports.checkDocumentExists(Expense, 'Expense');
