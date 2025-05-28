require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic route to test server
app.get('/', (req, res) => {
  res.send('Stock Management Backend is running');
});

const authRoutes = require('./routes/auth');

app.use('/api/auth', authRoutes);

const usersRoutes = require('./routes/users');

app.use('/api/users', usersRoutes);

const productsRoutes = require('./routes/products');

app.use('/api/products', productsRoutes);

const stockRoutes = require('./routes/stock');

app.use('/api/stock', stockRoutes);

const historyRoutes = require('./routes/history');

app.use('/api/history', historyRoutes);

const exportRoutes = require('./routes/export');

app.use('/api/export', exportRoutes);

app.listen(port, () => {
  console.log("Server running on port " + port);
});
