import express from 'express';
import bcrypt from 'bcrypt';
import verifyToken from '../middleware/auth.js';
import { Customer, Admin } from '../models/User.js';
import isAdmin from '../middleware/isAdmin.js';

export default function customerRoutes() {
    const router = express.Router();

    const createUserInstance = (row) => {
        const name = `${row.first_name} ${row.last_name}`;
        return row.admin
            ? new Admin(row.customer_id, name, row.email, ['report'])
            : new Customer(row.customer_id, name, row.email);
    };

    // GET all customers
    router.get("/customers", verifyToken, async (req, res) => {
        const db = req.app.locals.db;
        const q = "SELECT * FROM customer";
        try {
            const [rows] = await db.query(q);
            const users = rows.map(row => createUserInstance(row));
            // remove .toJSON()
            return res.json(users);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });

    router.post('/customer/id', verifyToken, async (req, res) => {
        const db = req.app.locals.db;
        const customerId = parseInt(req.body.customer_id, 10);

        if (isNaN(customerId)) {
            return res.status(400).json({ message: 'Invalid customer ID' });
        }

        try {
            const [rows] = await db.query('SELECT * FROM customer WHERE customer_id = ?', [customerId]);
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Customer not found' });
            }

            const user = createUserInstance(rows[0]);
            // remove .toJSON()
            res.json(user);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });

    router.post('/customer/email', verifyToken, async (req, res) => {
        const db = req.app.locals.db;
        const email = req.body.email;
        try {
            const [rows] = await db.query('SELECT * FROM customer WHERE email = ?', [email]);
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Customer not found' });
            }

            const user = createUserInstance(rows[0]);
            // remove .toJSON()
            res.json(user);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });

    // POST: update existing customer
    router.post("/update_customer", verifyToken, async (req, res) => {
        const db = req.app.locals.db;
        const { customer_id, email, password, first_name, last_name } = req.body;

        try {
            const [existing] = await db.query('SELECT * FROM customer WHERE customer_id = ?', [customer_id]);
            if (existing.length === 0) {
                return res.status(404).json({ message: 'Customer not found' });
            }

            let query, values;
            if (password && password.trim() !== '') {
                const password_hash = await bcrypt.hash(password, 10);
                query = "UPDATE customer SET email = ?, password = ?, first_name = ?, last_name = ? WHERE customer_id = ?";
                values = [email, password_hash, first_name, last_name, customer_id];
            } else {
                query = "UPDATE customer SET email = ?, first_name = ?, last_name = ? WHERE customer_id = ?";
                values = [email, first_name, last_name, customer_id];
            }

            await db.query(query, values);
            return res.json({ message: 'Customer updated successfully' });

        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });

    // POST: create customer (insecure)
    router.post("/customers", async (req, res) => {
        const db = req.app.locals.db;
        const values = [
            req.body.email,
            req.body.password,
            req.body.first_name,
            req.body.last_name
        ];
        const q = "INSERT INTO customer(`email`, `password`, `first_name`, `last_name`) VALUES (?)";
        try {
            const [data] = await db.query(q, [values]);
            return res.json(data);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });

    // POST: register with email 
    router.post('/register', async (req, res) => {
        const db = req.app.locals.db;
        const { email, password, first_name, last_name } = req.body;

        try {
            const [existing] = await db.query('SELECT * FROM customer WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            const password_hash = await bcrypt.hash(password, 10);
            const [result] = await db.query(
                'INSERT INTO customer (email, password, first_name, last_name) VALUES (?, ?, ?, ?)',
                [email, password_hash, first_name, last_name]
            );

            return res.status(201).json({ message: 'Registered successfully', customer_id: result.insertId });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });

    // Promote customer to admin
    router.post('/customer/promote_to_admin', verifyToken, isAdmin, async (req, res) => {
        const db = req.app.locals.db;
        const customerId = req.body.customer_id;

        if (!customerId) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        try {
            const [existing] = await db.query('SELECT * FROM customer WHERE customer_id = ?', [customerId]);
            if (existing.length === 0) {
                return res.status(404).json({ message: 'Customer not found' });
            }

            await db.query('UPDATE customer SET admin = 1 WHERE customer_id = ?', [customerId]);
            return res.json({ message: 'Customer promoted to admin successfully' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });

    // Delete customer
    router.post('/customer/delete', verifyToken, isAdmin, async (req, res) => {

        const db = req.app.locals.db;
        const customerId = req.body.customer_id;

        if (!customerId) {
            return res.status(400).json({ message: 'Customer ID is required' });
        }

        try {
            const [existing] = await db.query('SELECT * FROM customer WHERE customer_id = ?', [customerId]);
            if (existing.length === 0) {
                return res.status(404).json({ message: 'Customer not found' });
            }

            await db.query('DELETE FROM square_payments WHERE customer_id = ?', [customerId]);
            await db.query('DELETE FROM customer WHERE customer_id = ?', [customerId]);

            return res.json({ message: 'Customer deleted successfully' });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    });

    return router;
}
