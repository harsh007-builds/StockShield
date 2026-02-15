require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
// Middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`);
  next();
});
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5000', 'https://stock-shield.vercel.app'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/components', require('./routes/components'));
app.use('/api/pcbs', require('./routes/pcbs'));
app.use('/api/production', require('./routes/production'));
app.use('/api/procurement', require('./routes/procurement'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/excel', require('./routes/excel'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve React build in production
// Serve React build in production - SKIPPED FOR RENDER (Frontend is on Vercel)
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
//   });
// }

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
