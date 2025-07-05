// routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import verifyToken from '../middleware/auth.js';
import isAdmin from '../middleware/isAdmin.js';

import { Customer, Admin } from '../models/User.js';

export default function authRoutes(JWT_SECRET) {
    const router = express.Router();

    router.post('/login', async (req, res) => {
        const db = req.app.locals.db;
        const { email, password } = req.body;

        try {
            const [users] = await db.query('SELECT * FROM customer WHERE email = ?', [email]);
            if (users.length === 0) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const user = users[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // instance of Admin or Customer using inheritance
            let userInstance;
            if (user.admin === 1 || user.admin === true) {
                userInstance = new Admin(user.customer_id, user.name, user.email, ['report']);
            } else {
                userInstance = new Customer(user.customer_id, user.name, user.email);
            }

            const token = jwt.sign(
                {
                    customer_id: userInstance.id,
                    email: userInstance.email,
                    isAdmin: userInstance.isAdmin()
                },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.json({
                message: 'Login successful',
                customer_id: userInstance.id,
                isAdmin: userInstance.isAdmin(),
                token
            });
        } catch (err) {
            console.error('Login error:', err);
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    // Check customer 
    router.post('/check_customer', async (req, res) => {
        const db = req.app.locals.db;
        const { email, password } = req.body;

        const [users] = await db.query('SELECT * FROM customer WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ exists: false });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                exists: true,
                email: user.email,
                password: user.password
            });
        }

        res.json({ exists: true, email: user.email, password: user.password });
    });

    router.get('/me', verifyToken, async (req, res) => {
        const db = req.app.locals.db;
        const customer_id = req.customer_id;

        try {
            const [data] = await db.query('SELECT * FROM customer WHERE customer_id = ?', [customer_id]);
            if (data.length === 0) {
                return res.status(404).json({ message: 'Customer not found' });
            }
            res.json(data[0]);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get('/admin/report_customer', verifyToken, isAdmin, async (req, res) => {
        const db = req.app.locals.db;
        const [rows] = await db.query('SELECT * FROM customer');
        res.json(rows);
    });

    return router;
}
