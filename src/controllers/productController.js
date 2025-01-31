// controllers/productController.js
const Product = require('../models/Product')
const Rental = require('../models/Rental')

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body)
    await product.save()
    res.status(201).json(product)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate({
        path: 'parts.product',
        select: 'name dailyRate category'
      });

    // Har bir mahsulot uchun qismlarini tekshirish
    const productsWithParts = products.map(product => {
      if (product.type === 'combo' && product.parts) {
        // Qismlar ma'lumotlarini to'ldirish
        product.parts = product.parts.map(part => ({
          ...part.toObject(),
          product: part.product || null
        }));
      }
      return product;
    });

    res.json(productsWithParts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a product by ID and show associated rentals and customers
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate({
        path: 'parts.product',
        select: 'name dailyRate category'
      });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Qismlar ma'lumotlarini tekshirish
    if (product.type === 'combo' && product.parts) {
      product.parts = product.parts.map(part => ({
        ...part.toObject(),
        product: part.product || null
      }));
    }

    const rentals = await Rental.find({ 'borrowedProducts.product': req.params.id })
      .populate('customer', 'name phone');

    res.json({ product, rentals });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Update a product by ID
exports.updateProduct = async (req, res) => {
  try {
    // Kiritilgan ma'lumotlarni tekshirish
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Yangilash uchun ma\'lumotlar kiritilmagan'
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi'
      });
    }

    // Ruxsat etilgan maydonlarni belgilash
    const allowedUpdates = ['name', 'description', 'dailyRate', 'type', 'parts', 'status', 'quantity', 'category', 'isAvailable', 'availability'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri yangilash maydonlari'
      });
    }

    

    // Combo mahsulot uchun parts ni tekshirish
    if (req.body.type === 'combo' && Array.isArray(req.body.parts)) {
      let totalPrice = 0;
      for (const part of req.body.parts) {
        const partProduct = await Product.findById(part.product);
        if (!partProduct) {
          return res.status(400).json({
            success: false,
            message: 'Qism mahsulot topilmadi'
          });
        }
        const quantity = Number(part.quantity) || 0;
        const partPrice = Number(partProduct.dailyRate) || 0;
        totalPrice += partPrice * quantity;
      }
    }

    // Mahsulotni yangilash
    Object.assign(product, req.body);
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Mahsulot muvaffaqiyatli yangilandi',
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a product by ID
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Mahsulot topilmadi'
      })
    }

    const activeRentals = await Rental.find({
      'borrowedProducts.product': product._id,
      status: 'active'
    })

    if (activeRentals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ижара берилган махсулотни ўчириш мумкин эмас'
      })
    }

    await product.deleteOne()
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}