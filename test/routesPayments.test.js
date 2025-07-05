import assert from 'assert';
import express from 'express';
import request from 'supertest';
import paymentRoutes from '../routes/payments.js';
import { generateTestToken } from './jwtSetup.js';

describe('paymentRoutes', function () {
    let app;
    let token;

    // Mock DB for testing
    const mockDb = {
        query: async (query, params) => {
            // You can customize responses based on query or params if needed
            if (query.includes('INSERT INTO square_payments')) {
                return [{ insertId: 1 }];
            }
            if (query.includes('SELECT * FROM square_payments')) {
                return [[{ square_payment_id: params[0], amount: 1000, status: 'COMPLETED' }]];
            }
            return [[]]; // default empty result set
        }
    };

    before(function () {
        token = generateTestToken();

        app = express();
        app.use(express.json());
        app.locals.db = mockDb;

        // Mount your routes as usual
        app.use('/', paymentRoutes('fake_square_access_token', 'fake_square_location_id'));
    });

    it('should reject POST /square_payment without token', async function () {
        const res = await request(app)
            .post('/square_payment')
            .send({
                customer_id: 'test_customer_id',
                amount: 1000,
                currency: 'USD',
                square_payment_id: 'abc123',
                status: 'COMPLETED',
                last4: '1234'
            });
        assert.strictEqual(res.status, 403);
        assert.strictEqual(res.body.message, 'No token provided');
    });

    it('should allow POST /square_payment with valid token', async function () {
        const res = await request(app)
            .post('/square_payment')
            .set('Authorization', `Bearer ${token}`)
            .send({
                customer_id: 'test_customer_id',
                amount: 1000,
                currency: 'USD',
                square_payment_id: 'abc123',
                status: 'COMPLETED',
                last4: '1234'
            });
        console.log(res.body);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.message, 'Payment successful!');
    });

    it('should fetch payment details with valid token', async function () {
        const res = await request(app)
            .get('/square_payment/abc123')
            .set('Authorization', `Bearer ${token}`);
        console.log(res.body);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.id, 'abc123');
    });

});
