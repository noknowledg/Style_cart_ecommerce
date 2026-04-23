// Load environment variables
require('dotenv').config();

// Core packages
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const fs = require('fs');
const https = require('https');
const path = require('path');

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");
const adminRoutes = require("./routes/adminRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const auditRoutes = require("./routes/auditRoutes");

// Initialize Express app
const app = express();

// Serve static files (uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ------------------------
// Security Middleware
// ------------------------
app.use(helmet());             // Secure HTTP headers
app.use(cors({ origin: '*' })); // Allow requests (you can restrict to your frontend)
app.use(express.json());       // Parse JSON bodies
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Prevent caching of API responses
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Rate limiter to prevent brute-force attacks
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100,                 // max requests per IP per window
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// ------------------------
// Logging
// ------------------------
app.use(morgan('dev')); // HTTP request logging

// ------------------------
// Routes
// ------------------------
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/superadmin", superAdminRoutes);
app.use("/admin", adminRoutes);
app.use("/seller", sellerRoutes);
app.use("/product", productRoutes);
app.use("/cart", cartRoutes);
app.use("/order", orderRoutes);
app.use("/audit", auditRoutes);

app.get('/', (req, res) => {
  res.send('StyleCart Server is running successfully!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});


app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const sslOptions = {
  key: fs.readFileSync('localhost-key.pem'),
  cert: fs.readFileSync('localhost.pem')
};

const PORT = process.env.PORT || 5000;

https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Secure server running on https://localhost:${PORT}`);
});