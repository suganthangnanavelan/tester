import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const result = await axios.get('http://localhost:5000/products');
    setProducts(result.data);
  };

  const addOrUpdateProduct = async () => {
    const newProduct = {
      name,
      category,
      price,
      description,
    };

    if (editingId) {
      await axios.put(`http://localhost:5000/products/${editingId}`, newProduct);
    } else {
      await axios.post('http://localhost:5000/products', newProduct);
    }

    setName('');
    setCategory('');
    setPrice('');
    setDescription('');
    setEditingId(null);
    fetchProducts();
  };

  const deleteProduct = async (id) => {
    await axios.delete(`http://localhost:5000/products/${id}`);
    fetchProducts();
  };

  const startEditing = (product) => {
    setName(product.name);
    setCategory(product.category);
    setPrice(product.price);
    setDescription(product.description);
    setEditingId(product._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="container">
      <h1 className="heading">{editingId ? 'Update Product' : 'Product'}</h1>
      <div>
        <input
          type="text"
          value={name}
          placeholder="Product Name"
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          value={category}
          placeholder="Category"
          onChange={(e) => setCategory(e.target.value)}
        />
        <input
          type="number"
          value={price}
          placeholder="Price"
          onChange={(e) => setPrice(e.target.value)}
        />
        <textarea
          value={description}
          placeholder="Description"
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="add-btn" onClick={addOrUpdateProduct}>
          {editingId ? 'Update Product' : 'Add Product'}
        </button>
      </div>
      <h2>Products List</h2>
      <ul>
        {products.map((product) => (
          <li key={product._id}>
            <div className="product-name">
              <strong>{product.name}</strong>
            </div>
            <p><strong>Category:</strong> {product.category}</p>
            <p><strong>Price:</strong> ${product.price}</p>
            <p><strong>Description:</strong> {product.description}</p>
            <div className="action-buttons">
              <button className="edit-btn" onClick={() => startEditing(product)}>
                Edit
              </button>
              <button className="delete-btn" onClick={() => deleteProduct(product._id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProductManager;
