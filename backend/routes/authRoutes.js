const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const pool = require('../db');

// Validate password: at least 6 chars and at least 1 special character
function validatePassword(password) {
    if (password.length < 6) {
        return 'Password must be at least 6 characters long';
    }
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
    if (!specialCharRegex.test(password)) {
        return 'Password must contain at least one special character (e.g. !@#$%^&*)';
    }
    return null;
}

// POST /api/auth/register — Staff self-registration with name + password
router.post('/register', async (req, res) => {
    try {
        const { name, password, email, phone, role } = req.body;

        if (!name || !password) {
            return res.status(400).json({ error: 'Name and password are required' });
        }

        // Validate password strength
        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        // Check if name already exists (case-insensitive)
        const [existing] = await pool.query(
            'SELECT Staff_ID FROM STAFF WHERE LOWER(Staff_Name) = LOWER(?)',
            [name.trim()]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'An account with this name already exists' });
        }

        // Check if password is already used by another staff member (unique password)
        const [allStaff] = await pool.query('SELECT Password FROM STAFF WHERE Password IS NOT NULL');
        for (const s of allStaff) {
            const isDuplicate = await bcrypt.compare(password, s.Password);
            if (isDuplicate) {
                return res.status(409).json({ error: 'This password is already in use. Please choose a different password.' });
            }
        }

        // Hash password and create staff member
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const targetRole = role || 'staff';
        const [result] = await pool.query(
            'INSERT INTO STAFF (Staff_Name, Email, Phone, Password, Role) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), email || null, phone || null, hashedPassword, targetRole]
        );

        res.status(201).json({
            message: 'Account created successfully',
            user: {
                id: result.insertId,
                name: name.trim(),
                email: email || null,
                role: targetRole
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login — Staff or Trainer login with name + password
router.post('/login', async (req, res) => {
    try {
        const { name, password, role } = req.body;

        if (!name || !password) {
            return res.status(400).json({ error: 'Name and password are required' });
        }

        if (role === 'trainer') {
            // Find trainer by name (case-insensitive)
            const [rows] = await pool.query(
                'SELECT * FROM TRAINER WHERE LOWER(Trainer_Name) = LOWER(?) AND Is_Active = 1',
                [name.trim()]
            );

            if (rows.length === 0) {
                return res.status(401).json({ error: 'Invalid trainer name or access key' });
            }

            const trainer = rows[0];

            if (!trainer.Access_Key) {
                return res.status(401).json({ error: 'No access key set for this trainer account. Please contact admin.' });
            }

            if (trainer.Access_Key.trim().toUpperCase() !== password.trim().toUpperCase()) {
                return res.status(401).json({ error: 'Invalid trainer name or access key' });
            }

            return res.json({
                message: 'Trainer login successful',
                user: {
                    id: trainer.Trainer_ID,
                    name: trainer.Trainer_Name,
                    specialization: trainer.Specialization,
                    role: 'trainer'
                }
            });
        }

        // Find staff member by name (case-insensitive)
        const [rows] = await pool.query(
            'SELECT * FROM STAFF WHERE LOWER(Staff_Name) = LOWER(?) AND Is_Active = 1',
            [name.trim()]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid name or password' });
        }

        const staff = rows[0];

        // Check if password is set
        if (!staff.Password) {
            return res.status(401).json({ error: 'No password set for this account. Please contact admin.' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, staff.Password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid name or password' });
        }

        res.json({
            message: 'Login successful',
            user: {
                id: staff.Staff_ID,
                name: staff.Staff_Name,
                email: staff.Email,
                role: staff.Role || 'staff'
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

module.exports = router;
