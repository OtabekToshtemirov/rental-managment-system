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
      })
      .sort({ name: 1 }); // Sort by name in ascending order

    const productsWithParts = products.map(product => {
      if (product.type === 'combo' && product.parts) {
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
    const productId = req.params.id || req.body._id;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Маҳсулот ID си кўрсатилмаган'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Маҳсулот топилмади'
      });
    }

    // Validate and update product fields
    Object.assign(product, req.body);
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Маҳсулот муваффақиятли янгиланди',
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