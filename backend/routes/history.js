const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get stock movement history (admin sees all, technician sees own site)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT sm.id, p.name as product_name, si.name as site_name, sm.quantity_change, sm.movement_type, sm.timestamp, u.username as user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      JOIN sites si ON sm.site_id = si.id
      LEFT JOIN users u ON sm.user_id = u.id
    `;
    let params = [];
    if (req.user.role === 'technician') {
      query += ' WHERE sm.site_id = $1';
      params.push(req.user.siteId);
    }
    query += ' ORDER BY sm.timestamp DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
