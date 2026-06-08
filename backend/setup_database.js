/**
 * Database Setup Script
 * Creates the gym_management database and ALL required tables.
 * Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS patterns).
 *
 * Usage: node backend/setup_database.js
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function setup() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 3306;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const dbName = process.env.DB_NAME || 'gym_management';

    // Enable SSL for cloud databases (Railway, Aiven, etc.)
    const sslConfig = host && host !== 'localhost'
        ? { rejectUnauthorized: false }
        : undefined;

    console.log('\n🏋️  Gym Management System — Database Setup');
    console.log('─'.repeat(50));
    console.log(`   Host:     ${host}:${port}`);
    console.log(`   User:     ${user}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   SSL:      ${sslConfig ? 'enabled' : 'disabled'}`);
    console.log('─'.repeat(50));

    // Step 1: Connect WITHOUT a database to create it (skip for cloud providers that pre-create DB)
    let conn;
    try {
        conn = await mysql.createConnection({ host, port, user, password, ssl: sslConfig });
        try {
            await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
            console.log(`\n✅ Database "${dbName}" is ready.`);
        } catch (createErr) {
            // Cloud providers like Railway may not allow CREATE DATABASE — that's OK
            console.log(`\nℹ️  Using pre-existing database "${dbName}".`);
        }
        await conn.end();
    } catch (err) {
        console.error('\n❌ Cannot connect to MySQL. Make sure MySQL is running.');
        console.error('   Error:', err.message);
        process.exit(1);
    }

    // Step 2: Connect WITH the database and create tables
    const pool = await mysql.createPool({
        host, port, user, password,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 5,
        ssl: sslConfig
    });

    try {
        // --- TRAINER ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS TRAINER (
                Trainer_ID INT AUTO_INCREMENT PRIMARY KEY,
                Trainer_Name VARCHAR(100) NOT NULL,
                Specialization VARCHAR(100),
                Phone VARCHAR(15),
                Experience INT DEFAULT 0,
                Access_Key VARCHAR(20) NULL,
                Is_Active TINYINT(1) DEFAULT 1
            )
        `);
        console.log('✅ TRAINER table ready');

        // --- MEMBER ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS MEMBER (
                Member_ID INT AUTO_INCREMENT PRIMARY KEY,
                Name VARCHAR(100) NOT NULL,
                Age INT,
                Gender ENUM('Male', 'Female', 'Other'),
                Phone VARCHAR(15),
                Address VARCHAR(255),
                Join_Date DATE,
                Trainer_ID INT,
                FOREIGN KEY (Trainer_ID) REFERENCES TRAINER(Trainer_ID)
                    ON DELETE SET NULL ON UPDATE CASCADE
            )
        `);
        console.log('✅ MEMBER table ready');

        // --- PAYMENT ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS PAYMENT (
                Payment_ID INT AUTO_INCREMENT PRIMARY KEY,
                Member_ID INT,
                Amount DECIMAL(10, 2) NOT NULL,
                Payment_Date DATE,
                Payment_Method ENUM('Cash', 'Card', 'UPI', 'Online') DEFAULT 'Cash',
                Membership_Type ENUM('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly') DEFAULT 'Monthly',
                FOREIGN KEY (Member_ID) REFERENCES MEMBER(Member_ID)
                    ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);
        console.log('✅ PAYMENT table ready');

        // --- STAFF ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS STAFF (
                Staff_ID INT AUTO_INCREMENT PRIMARY KEY,
                Staff_Name VARCHAR(100) NOT NULL,
                Email VARCHAR(100),
                Phone VARCHAR(20),
                Role VARCHAR(50) DEFAULT 'staff',
                Access_Key VARCHAR(20) NULL,
                Password VARCHAR(255) NULL,
                Is_Active TINYINT(1) DEFAULT 1,
                Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ STAFF table ready');

        // Ensure Password column exists (in case table was created by old migration)
        try {
            const [cols] = await pool.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'STAFF' AND COLUMN_NAME = 'Password'`
            );
            if (cols.length === 0) {
                await pool.query('ALTER TABLE STAFF ADD COLUMN Password VARCHAR(255) NULL');
                console.log('   ↳ Added Password column to STAFF');
            }
        } catch (e) { /* ignore */ }

        // --- EXPENDITURE ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS EXPENDITURE (
                Expenditure_ID INT AUTO_INCREMENT PRIMARY KEY,
                Category VARCHAR(100) NOT NULL,
                Description TEXT,
                Amount DECIMAL(10, 2) NOT NULL,
                Expenditure_Date DATE NOT NULL,
                Added_By VARCHAR(100) DEFAULT 'admin',
                Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ EXPENDITURE table ready');

        // --- ISSUE_REPORT ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ISSUE_REPORT (
                Report_ID INT AUTO_INCREMENT PRIMARY KEY,
                Staff_ID INT NOT NULL,
                Report_Type ENUM('member_feedback', 'equipment_shortage', 'equipment_damage', 'other') NOT NULL,
                Title VARCHAR(200) NOT NULL,
                Description TEXT NOT NULL,
                Priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                Status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
                Admin_Response TEXT,
                Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (Staff_ID) REFERENCES STAFF(Staff_ID) ON DELETE CASCADE
            )
        `);
        console.log('✅ ISSUE_REPORT table ready');

        // --- DIET_PLAN ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS DIET_PLAN (
                Plan_ID INT AUTO_INCREMENT PRIMARY KEY,
                Member_ID INT NOT NULL,
                Trainer_ID INT NOT NULL,
                Plan_Name VARCHAR(100) NOT NULL,
                Goal VARCHAR(100),
                Breakfast TEXT,
                Lunch TEXT,
                Dinner TEXT,
                Snacks TEXT,
                Notes TEXT,
                Created_At DATE,
                FOREIGN KEY (Member_ID) REFERENCES MEMBER(Member_ID) ON DELETE CASCADE ON UPDATE CASCADE,
                FOREIGN KEY (Trainer_ID) REFERENCES TRAINER(Trainer_ID) ON DELETE CASCADE ON UPDATE CASCADE
            )
        `);
        console.log('✅ DIET_PLAN table ready');

        // --- WORKOUT ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS WORKOUT (
                Workout_ID INT AUTO_INCREMENT PRIMARY KEY,
                Member_ID INT NOT NULL,
                Trainer_ID INT NOT NULL,
                Workout_Name VARCHAR(100) NOT NULL,
                Day_Of_Week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
                Exercises TEXT,
                Sets_Reps VARCHAR(255),
                Duration_Minutes INT,
                Notes TEXT,
                Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (Member_ID) REFERENCES MEMBER(Member_ID) ON DELETE CASCADE,
                FOREIGN KEY (Trainer_ID) REFERENCES TRAINER(Trainer_ID) ON DELETE CASCADE
            )
        `);
        console.log('✅ WORKOUT table ready');

        // --- Seed default admin account (only if no staff exists) ---
        const [staffRows] = await pool.query('SELECT COUNT(*) AS count FROM STAFF');
        if (staffRows[0].count === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Admin@123', salt);
            await pool.query(
                `INSERT INTO STAFF (Staff_Name, Email, Role, Password, Is_Active) 
                 VALUES (?, ?, ?, ?, ?)`,
                ['Admin', 'admin@gym.com', 'admin', hashedPassword, 1]
            );
            console.log('\n🔑 Default admin account created:');
            console.log('   Name:     Admin');
            console.log('   Password: Admin@123');
        } else {
            console.log('\nℹ️  Staff table already has data — skipping admin seed.');
        }

        // --- Seed sample trainers (only if no trainers exist) ---
        const [trainerRows] = await pool.query('SELECT COUNT(*) AS count FROM TRAINER');
        if (trainerRows[0].count === 0) {
            await pool.query(`
                INSERT INTO TRAINER (Trainer_Name, Specialization, Phone, Experience) VALUES
                ('Rahul Sharma', 'Weight Training', '9876543210', 5),
                ('Priya Patel', 'Yoga & Flexibility', '9876543211', 3),
                ('Amit Kumar', 'Cardio & HIIT', '9876543212', 7)
            `);
            console.log('✅ Sample trainers seeded');
        }

        // --- Seed sample members (only if no members exist) ---
        const [memberRows] = await pool.query('SELECT COUNT(*) AS count FROM MEMBER');
        if (memberRows[0].count === 0) {
            await pool.query(`
                INSERT INTO MEMBER (Name, Age, Gender, Phone, Address, Join_Date, Trainer_ID) VALUES
                ('Aarav Mehta', 25, 'Male', '9001234567', '123 MG Road, Mumbai', '2026-01-15', 1),
                ('Sneha Gupta', 22, 'Female', '9001234568', '45 Park Street, Delhi', '2026-02-10', 2),
                ('Vikram Singh', 30, 'Male', '9001234569', '78 Lake Road, Pune', '2026-03-01', 1)
            `);
            console.log('✅ Sample members seeded');
        }

        // --- Seed sample payments (only if no payments exist) ---
        const [paymentRows] = await pool.query('SELECT COUNT(*) AS count FROM PAYMENT');
        if (paymentRows[0].count === 0) {
            await pool.query(`
                INSERT INTO PAYMENT (Member_ID, Amount, Payment_Date, Payment_Method, Membership_Type) VALUES
                (1, 2000.00, '2026-01-15', 'UPI', 'Monthly'),
                (2, 5000.00, '2026-02-10', 'Card', 'Quarterly'),
                (3, 2000.00, '2026-03-01', 'Cash', 'Monthly')
            `);
            console.log('✅ Sample payments seeded');
        }

        console.log('\n' + '─'.repeat(50));
        console.log('🎉 Database setup complete! All tables are ready.');
        console.log('─'.repeat(50) + '\n');

    } catch (err) {
        console.error('\n❌ Setup error:', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        await pool.end();
    }

    process.exit(0);
}

setup();
