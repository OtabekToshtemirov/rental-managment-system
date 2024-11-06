// controllers/customerController.js
const Customer = require('../models/Customer')

// Create a new customer
exports.createCustomer = async (req, res) => {
  try {
    const customer = new Customer(req.body)
    await customer.save()
    res.status(201).json(customer)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find()
    res.json(customers)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Get a customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer)
      return res.status(404).json({ message: 'Customer not found' })
    res.json(customer)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Update a customer by ID
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
    if (!customer)
      return res.status(404).json({ message: 'Customer not found' })
    res.json(customer)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Delete a customer by ID
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id)
    if (!customer)
      return res.status(404).json({ message: 'Customer not found' })
    res.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
