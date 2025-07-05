import express from 'express';
import crypto from 'crypto';
import { Client, Environment } from 'square/legacy';
import verifyToken from '../middleware/auth.js';
import Payment from '../models/Payment.js';

export default function paymentRoutes(squareAccessToken, squareLocationId) {
  const client = new Client({
    bearerAuthCredentials: {
      accessToken: squareAccessToken,
    },
    environment: Environment.Sandbox,
  });

  const router = express.Router();

  // Square payment processing
  router.post('/process-payment', async (req, res) => {
    const db = req.app.locals.db;
    const { nonce, amount } = req.body;

    try {
      const { result } = await client.paymentsApi.createPayment({
        sourceId: nonce,
        amountMoney: {
          amount: parseInt(amount),
          currency: 'USD',
        },
        idempotencyKey: crypto.randomUUID(),
        locationId: squareLocationId,
      });

      const payment = result.payment;

      const sanitizedPayment = JSON.parse(JSON.stringify(payment, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));

      res.json({ success: true, payment: sanitizedPayment });
    } catch (error) {
      console.error('Square payment error:', error);
      res.status(500).json({ success: false, error: error.message || 'Payment failed' });
    }
  });

  // Record a payment in your database
  router.post('/square_payment', verifyToken, async (req, res) => {
    const db = req.app.locals.db;
    const {
      customer_id,
      amount,
      currency,
      square_payment_id,
      status,
      last4,
    } = req.body;

    try {
      await db.query(
        `INSERT INTO square_payments (customer_id, amount, currency, square_payment_id, status, last4)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [customer_id, amount, currency, square_payment_id, status, last4]
      );

      const payment = Payment.fromObject({
        payment_id: square_payment_id,
        customer_id,
        amount,
        payment_date: new Date().toISOString(),
      });

      res.json({ message: 'Payment successful!', payment: payment.format() });
    } catch (err) {
      console.error('Payment error:', err);
      res.status(500).json({ message: 'Payment failed', error: err.message });
    }
  });

  router.get('/square_payment/:id', verifyToken, async (req, res) => {
    const db = req.app.locals.db;
    const payment_id = req.params.id;

    if (!payment_id) {
      return res.status(400).json({ message: 'payment_id is required' });
    }

    try {
      const [rows] = await db.query(
        'SELECT * FROM square_payments WHERE square_payment_id = ?',
        [payment_id]
      );
 
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Square payment not found' });
      }

      const payment = Payment.fromObject(rows[0]);
      const formatted = payment.format();

      res.json(formatted);
    } catch (err) {
      console.error('Fetch square payment error:', err);
      res.status(500).json({ message: 'Failed to retrieve square payment', error: err.message });
    }
  });

  // List all payments
  router.get("/square_payments", async (req, res) => {
    const db = req.app.locals.db;
    try {
      const [rows] = await db.query("SELECT * FROM square_payments");
      const payments = rows.map(Payment.fromObject).map(p => p.format());
      return res.json(payments);
    } catch (err) {
      console.error('Get all payments error:', err);
      return res.status(500).json({ message: 'Failed to load payments', error: err.message });
    }
  });

  return router;
}
