// controllers/rentalController.js
const Rental = require('../models/Rental')
const Product = require('../models/Product')
const moment = require('moment')

// Create a new rental
exports.createRental = async (req, res) => {
  try {
    const { customer, products, startDate, endDate } = req.body
    const totalCost = await calculateTotalCost(products, startDate, endDate)

    const rental = new Rental({
      customer,
      products,
      startDate,
      endDate,
      totalCost,
    })
    await rental.save()
    res.status(201).json(rental)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Get all rentals
exports.getAllRentals = async (req, res) => {
  try {
    const rentals = await Rental.find()
      .populate('customer', 'name phone')
      .populate('products', 'name dailyRate')
    res.json(rentals)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Get a rental by ID
exports.getRentalById = async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id)
      .populate('customer', 'name phone')
      .populate('products', 'name dailyRate')
    if (!rental) return res.status(404).json({ message: 'Rental not found' })
    res.json(rental)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Update a rental by ID
exports.updateRental = async (req, res) => {
  try {
    const rental = await Rental.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
    if (!rental) return res.status(404).json({ message: 'Rental not found' })
    res.json(rental)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Delete a rental by ID
exports.deleteRental = async (req, res) => {
  try {
    const rental = await Rental.findByIdAndDelete(req.params.id)
    if (!rental) return res.status(404).json({ message: 'Rental not found' })
    res.json({ message: 'Rental deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Helper function to calculate the total rental cost
async function calculateTotalCost(products, startDate, endDate) {
  const days = moment(endDate).diff(moment(startDate), 'days') + 1
  let totalCost = 0

  for (const productId of products) {
    const product = await Product.findById(productId)
    if (product && product.dailyRate) {
      totalCost += product.dailyRate * days
    }
  }

  return totalCost
}
