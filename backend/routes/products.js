const express = require('express');
const router = express.Router();
const Product = require('../models/product');

// CREATE product
router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).send(product);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// READ all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).send(products);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// UPDATE product by ID
router.put('/:id', async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProduct) return res.status(404).send('Product not found');
    res.status(200).send(updatedProduct);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// DELETE product by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).send('Product not found');
    res.status(200).send(deletedProduct);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = router;
