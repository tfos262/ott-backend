import express from 'express';
import verifyToken from '../middleware/auth.js';
import Teetime from '../models/Teetime.js';

export default function teetimesRoutes() {
  const router = express.Router();

  router.use((req, res, next) => {
    req.teetimeModel = new Teetime(req.app.locals.db);
    next();
  });

  router.get('/available-teetimes', async (req, res) => {
    const { date } = req.query;

    try {
      const availability = await req.teetimeModel.getAvailableTeeTimes(date);
      res.json(availability);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/reserved-teetimes', async (req, res) => {
    const { date } = req.query;

    try {
      const occupied = await req.teetimeModel.getReservedTeeTimes(date);
      res.json(occupied);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/reserved-teetimes', verifyToken, async (req, res) => {
    try {
      const teetime_id = await req.teetimeModel.createReservation({
        customer_id: req.customer_id,
        num_golfers: req.body.num_golfers,
        total_price: req.body.total_price,
        paid: req.body.paid,
        date_time: req.body.date_time,
      });
      res.json({ success: true, teetime_id });
    } catch (err) {
      console.error('Error inserting tee time:', err);
      res.status(500).json({ success: false, message: 'DB insert error', error: err.message });
    }
  });

  router.get('/teetimes', async (req, res) => {
    try {
      const data = await req.teetimeModel.getAll();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/teetimes/:date', async (req, res) => {
    const { date } = req.params;

    try {
      const data = await req.teetimeModel.getByDate(date);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
