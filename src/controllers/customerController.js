// controllers/customerController.js
const Customer = require('../models/Customer')
const Rental = require('../models/Rental')
const moment = require('moment')

// Create a new customer
exports.createCustomer = async (req, res) => {
  try {
    const customer = new Customer({
      ...req.body,
      status: req.body.status || 'oddiy'
    })
    await customer.save()
    res.status(201).json(customer)
  } catch (error) {
    res.status(400).json({ message: "Ma'lumotlar noto'g'ri kiritilgan", error: error.message })
  }
}

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find()
    res.json(customers)
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message })
  }
}

// Get a customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      return res.status(404).json({ message: 'Mijoz topilmadi' })
    }
    res.json(customer)
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message })
  }
}

// Update a customer by ID
exports.updateCustomer = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Status validation if it's being updated
    if (updateData.status) {
      if (!['VIP', 'oddiy', 'bad'].includes(updateData.status)) {
        return res.status(400).json({ message: 'Noto\'g\'ri status kiritildi' });
      }
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id, 
      updateData,
      { new: true }
    )
    
    if (!customer) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    
    res.json(customer)
  } catch (error) {
    res.status(400).json({ message: "Ma'lumotlarni yangilashda xatolik", error: error.message })
  }
}

// Delete a customer by ID
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }
    res.json({ message: 'Mijoz muvaffaqiyatli o\'chirildi' })
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message })
  }
}

// Get customers by status
exports.getCustomersByStatus = async (req, res) => {
  try {
    const { status } = req.query
    const query = status ? { status } : {}
    const customers = await Customer.find(query)
    res.json(customers)
  } catch (error) {
    res.status(500).json({ message: "Serverda xatolik yuz berdi", error: error.message })
  }
}

// Get top customers statistics
exports.getTopCustomers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    const startDate = req.query.startDate ? moment(req.query.startDate).toDate() : moment().subtract(1, 'year').toDate()
    const endDate = req.query.endDate ? moment(req.query.endDate).toDate() : moment().toDate()

    const topCustomers = await Rental.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$customerId",
          totalRentals: { $sum: 1 },
          totalSpent: { $sum: "$totalCost" }
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
          totalRentals: 1,
          totalSpent: 1,
          customerName: "$customerInfo.name",
          customerPhone: "$customerInfo.phone",
          customerStatus: "$customerInfo.status"
        }
      },
      { $sort: { totalRentals: -1 } },
      { $limit: limit }
    ])

    res.json({
      success: true,
      data: topCustomers
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

// Get customer rental history statistics
exports.getCustomerRentalHistory = async (req, res) => {
  try {
    const customerId = req.params.id
    const startDate = req.query.startDate ? moment(req.query.startDate).toDate() : moment().subtract(1, 'year').toDate()
    const endDate = req.query.endDate ? moment(req.query.endDate).toDate() : moment().toDate()

    const rentalHistory = await Rental.aggregate([
      {
        $match: {
          customerId: customerId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          totalCost: 1,
          products: 1,
          productDetails: 1,
          status: 1
        }
      },
      { $sort: { createdAt: -1 } }
    ])

    res.json({
      success: true,
      data: rentalHistory
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
