const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { validateExpense } = require('../middleware/validation');
const { checkExpenseExists } = require('../middleware/checks');

// Statistics route
router.get('/stats', expenseController.getExpenseStats);

// Basic CRUD operations
router.post('/', validateExpense, expenseController.createExpense);
router.get('/', expenseController.getAllExpenses);
router.get('/:id', checkExpenseExists, expenseController.getExpenseById);
router.put('/:id', checkExpenseExists, validateExpense, expenseController.updateExpense);
router.delete('/:id', checkExpenseExists, expenseController.deleteExpense);

module.exports = router;
