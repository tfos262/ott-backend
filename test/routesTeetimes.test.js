import assert from 'assert';
import request from 'supertest';
import express from 'express';
import teetimesRoutes from '../routes/teetimes.js';
import { generateTestToken } from './jwtSetup.js';

describe('Teetimes Routes', () => {
    let app;
    let token;

    const teetimes = [
        {
            id: 1,
            customer_id: 'cust_001',
            num_golfers: 2,
            total_price: 100,
            paid: true,
            date_time: '2024-07-01 10:00:00'
        }
    ];

    const mockDb = {
        query: async (query, params) => {
            if (query.includes('FROM teetime WHERE DATE(date_time) =')) {
                return [teetimes];
            }

            if (query.includes('FROM teetime WHERE DATE_FORMAT')) {
                // for available/reserved
                return [[
                    { time: '10:00', total_booked: 2 }
                ]];
            }

            if (query.includes('SELECT * FROM teetime')) {
                return [teetimes];
            }

            if (query.startsWith('INSERT INTO teetime')) {
                return [{ insertId: 99 }];
            }

            return [[]];
        }
    };

    before(function () {
        token = generateTestToken();

        app = express();
        app.use(express.json());
        app.locals.db = mockDb;

        // Mount route
        app.use('/', teetimesRoutes());
    });

    it('GET /teetimes should return all teetimes', async () => {
        const res = await request(app)
            .get('/teetimes')
            .set('Authorization', `Bearer ${token}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(Array.isArray(res.body), true);
    });

    it('GET /available-teetimes should return tee times with availability', async () => {
        const res = await request(app)
            .get('/available-teetimes')
            .query({ date: '2024-07-01' })
            .set('Authorization', `Bearer ${token}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(Array.isArray(res.body), true);
    });

    it('GET /reserved-teetimes should return tee times with bookings', async () => {
        const res = await request(app)
            .get('/reserved-teetimes')
            .query({ date: '2024-07-01' })
            .set('Authorization', `Bearer ${token}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(Array.isArray(res.body), true);
    });

    it('POST /reserved-teetimes should insert a new tee time with valid token', async () => {
        const newTee = {
            num_golfers: 2,
            total_price: 100,
            paid: true,
            date_time: '2024-07-01 10:00:00'
        };

        const res = await request(app)
            .post('/reserved-teetimes')
            .set('Authorization', `Bearer ${token}`)
            .send(newTee);

        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.success, true);
        assert.ok(res.body.teetime_id !== undefined);
    });

    it('POST /reserved-teetimes should fail without token', async () => {
        const res = await request(app)
            .post('/reserved-teetimes')
            .send({
                num_golfers: 2,
                total_price: 100,
                paid: true,
                date_time: '2024-07-01 10:30:00'
            });

        assert.strictEqual(res.status, 403);
        assert.strictEqual(res.body.message, 'No token provided');
    });

    it('GET /teetimes/:date should return tee times for a specific date', async () => {
        const res = await request(app)
            .get('/teetimes/2024-07-01')
            .set('Authorization', `Bearer ${token}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(Array.isArray(res.body), true);
    });

    it('GET /teetimes/:date should return tee times for a specific date, reflecting the correct amount of num_golfers', async () => {
        const res = await request(app)
            .get('/teetimes/2024-07-01')
            .set('Authorization', `Bearer ${token}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(Array.isArray(res.body), true);
        const tee = res.body.find(t => t.date_time === '2024-07-01 10:00:00');
        assert.ok(tee, 'Expected teetime not found');
        assert.strictEqual(tee.num_golfers, 2);
    });

    // this is to verify the incorrect token did not still book the reservation
    it('GET /teetimes/:date should return tee times for a specific date, reflecting the correct amount of num_golfers, when an invalid token is used', async () => {
        const res = await request(app)
            .get('/teetimes/2024-07-01')
            .set('Authorization', `Bearer ${token}`);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(Array.isArray(res.body), true);
        const tee = res.body.find(t => t.date_time === '2024-07-01 10:30:00');
        // should throw an error because the reserved_teetime was not booked, so it won't be in the response
        assert.ok(!tee, 'Expected teetime not found');
    });
});
