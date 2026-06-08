const express = require('express');
const cors = require('cors');
const path = require('path');

// Load env — try root .env first, then backend/.env, silently skip if neither exists
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

// Import routes from backend
const memberRoutes = require('../backend/routes/memberRoutes');
const trainerRoutes = require('../backend/routes/trainerRoutes');
const paymentRoutes = require('../backend/routes/paymentRoutes');
const statsRoutes = require('../backend/routes/stats');
const authRoutes = require('../backend/routes/authRoutes');
const dietPlanRoutes = require('../backend/routes/dietPlanRoutes');
const staffRoutes = require('../backend/routes/staffRoutes');
const expenditureRoutes = require('../backend/routes/expenditureRoutes');
const issueRoutes = require('../backend/routes/issueRoutes');
const workoutRoutes = require('../backend/routes/workoutRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/diet-plans', dietPlanRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/expenditures', expenditureRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/workouts', workoutRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Gym Management API is running on Vercel' });
});

// Export for Vercel serverless
module.exports = app;
