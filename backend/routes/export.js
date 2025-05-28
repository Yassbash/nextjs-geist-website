const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

// Export stock data as CSV or PDF
router.get('/stock', authenticateToken, async (req, res) => {
  const format = req.query.format || 'csv';
  try {
    let query = `
      SELECT p.name as product_name, si.name as site_name, s.quantity
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
    const data = result.rows;

    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=stock.pdf');
      doc.pipe(res);
      doc.fontSize(18).text('Stock Data', { align: 'center' });
      doc.moveDown();
      data.forEach(row => {
        doc.fontSize(12).text(`Site: ${row.site_name} | Product: ${row.product_name} | Quantity: ${row.quantity}`);
      });
      doc.end();
    } else {
      // Default CSV
      const fields = ['site_name', 'product_name', 'quantity'];
      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment('stock.csv');
      res.send(csv);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export stock movement history as CSV or PDF
router.get('/history', authenticateToken, async (req, res) => {
  const format = req.query.format || 'csv';
  try {
    let query = `
      SELECT p.name as product_name, si.name as site_name, sm.quantity_change, sm.movement_type, sm.timestamp, u.username as user_name
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
    const data = result.rows;

    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=history.pdf');
      doc.pipe(res);
      doc.fontSize(18).text('Stock Movement History', { align: 'center' });
      doc.moveDown();
      data.forEach(row => {
        doc.fontSize(12).text(`Date: ${row.timestamp.toISOString()} | Site: ${row.site_name} | Product: ${row.product_name} | Change: ${row.quantity_change} | Type: ${row.movement_type} | User: ${row.user_name}`);
      });
      doc.end();
    } else {
      // Default CSV
      const fields = ['timestamp', 'site_name', 'product_name', 'quantity_change', 'movement_type', 'user_name'];
      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      res.header('Content-Type', 'text/csv');
      res.attachment('history.csv');
      res.send(csv);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
