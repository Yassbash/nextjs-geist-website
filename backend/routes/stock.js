const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get stock quantities (admin sees all, technician sees own site)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT s.id, p.name as product_name, si.name as site_name, s.quantity
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN sites si ON s.site_id = si.id
    `;
    let params = [];
    if (req.user.role === 'technician') {
      query += ' WHERE s.site_id = $1';
      params.push(req.user.siteId);
    }
    query += ' ORDER BY si.name, p.name';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update stock quantity (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  if (quantity == null || isNaN(quantity)) {
    return res.status(400).json({ message: 'Valid quantity is required' });
  }
  try {
    const result = await db.query(
      'UPDATE stock SET quantity = $1 WHERE id = $2 RETURNING *',
      [quantity, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Stock record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Record stock movement (admin only)
router.post('/movement', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { product_id, site_id, quantity_change, movement_type } = req.body;
  if (!product_id || !site_id || !quantity_change || !['in', 'out'].includes(movement_type)) {
    return res.status(400).json({ message: 'Missing or invalid fields' });
  }
  try {
    // Update stock quantity
    const stockResult = await db.query(
      'SELECT * FROM stock WHERE product_id = $1 AND site_id = $2',
      [product_id, site_id]
    );
    if (stockResult.rows.length === 0) {
      // Insert new stock record
      await db.query(
        'INSERT INTO stock (product_id, site_id, quantity) VALUES ($1, $2, $3)',
        [product_id, site_id, movement_type === 'in' ? quantity_change : -quantity_change]
      );
    } else {
      // Update existing stock quantity
      let newQuantity = stockResult.rows[0].quantity + (movement_type === 'in' ? quantity_change : -quantity_change);
      if (newQuantity < 0) newQuantity = 0;
      await db.query(
        'UPDATE stock SET quantity = $1 WHERE id = $2',
        [newQuantity, stockResult.rows[0].id]
      );
    }
    // Insert stock movement record
    const movementResult = await db.query(
      'INSERT INTO stock_movements (product_id, site_id, quantity_change, movement_type, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [product_id, site_id, quantity_change, movement_type, req.user.userId]
    );
    res.status(201).json(movementResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
