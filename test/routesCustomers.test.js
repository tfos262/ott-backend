import express from 'express';
import assert from 'assert';
import supertest from 'supertest';
import bcrypt from 'bcrypt';
import customerRoutes from '../routes/customers.js';
import { generateTestToken } from './jwtSetup.js';

describe('Customer Routes', function () {
    let app;
    let request;
    let token;
    let adminToken;
    let mockDb;
    let currentAdminFlag = false;

    beforeEach(() => {
        token = generateTestToken(false);      // non-admin token
        adminToken = generateTestToken(true);  // admin token for protected routes
        currentAdminFlag = false;

        app = express();
        app.use(express.json());

        mockDb = {
            query: async (q, params) => {
                if (q.startsWith('SELECT * FROM customer WHERE customer_id')) {
                    if (params[0] === 1) {
                        return [[{
                            customer_id: 1,
                            email: 'test@example.com',
                            password: await bcrypt.hash('password', 10),
                            first_name: 'Test',
                            last_name: 'User',
                            admin: currentAdminFlag ? 1 : 0
                        }]];
                    }
                    return [[]]; // no customer found
                }

                if (q.startsWith('SELECT * FROM customer WHERE email = ?')) {
                    if (params[0] === 'exists@example.com') {
                        return [[{ customer_id: 2, email: 'exists@example.com', first_name: 'Exists', last_name: 'User', admin: 0 }]];
                    }
                    return [[]];
                }

                if (q.startsWith('SELECT * FROM customer')) {
                    return [[
                        { customer_id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User', admin: 0 },
                        { customer_id: 2, email: 'exists@example.com', first_name: 'Exists', last_name: 'User', admin: 0 }
                    ]];
                }

                if (q.startsWith('INSERT INTO customer')) {
                    return [{ insertId: 123 }];
                }

                if (q.startsWith('UPDATE customer')) {
                    return [{}];
                }

                if (q.startsWith('UPDATE customer SET admin = 1')) {
                    return [{}];
                }

                if (q.startsWith('DELETE FROM square_payments')) {
                    return [{}];
                }
                if (q.startsWith('DELETE FROM customer')) {
                    return [{}];
                }

                return [[]];
            }
        };

        app.locals.db = mockDb;
        app.use('/', customerRoutes());
        request = supertest(app);
    });

    it('GET /customers should return all customers', async () => {
        const res = await request.get('/customers').set('Authorization', `Bearer ${token}`);
        assert.strictEqual(res.status, 200);
        assert(Array.isArray(res.body));
        assert(res.body.length >= 2);
        assert.strictEqual(res.body[0].email, 'test@example.com');
    });

    it('POST /customer/id should return a customer if exists', async () => {
        const res = await request
            .post('/customer/id')
            .set('Authorization', `Bearer ${token}`)
            .send({ customer_id: 1 });
        // console.log("POST id ", res.body);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.email, 'test@example.com');
    });

    it('POST /customer/id should return 404 if not found', async () => {
        const res = await request
            .post('/customer/id')
            .set('Authorization', `Bearer ${token}`)
            .send({ customer_id: 999 });
        assert.strictEqual(res.status, 404);
        assert.strictEqual(res.body.message, 'Customer not found');
    });

    it('POST /register should register a new customer', async () => {
        const res = await request.post('/register').send({
            email: 'newuser@example.com',
            password: 'mypassword',
            first_name: 'New',
            last_name: 'User',
        });
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.body.message, 'Registered successfully');
    });

    it('POST /register should fail if email exists', async () => {
        const res = await request.post('/register').send({
            email: 'exists@example.com',
            password: 'pass',
            first_name: 'Exists',
            last_name: 'User',
        });
        assert.strictEqual(res.status, 400)
    });

    it('POST /customer/promote_to_admin should promote customer to admin', async () => {
        currentAdminFlag = true;
        const res = await request
            .post('/customer/promote_to_admin')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ customer_id: 1 });
        currentAdminFlag = false;  // reset if needed
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.message, 'Customer promoted to admin successfully');
    });

    it('POST /customer/delete should delete a customer', async () => {
        currentAdminFlag = true;
        const res = await request
            .post('/customer/delete')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ customer_id: 1 });
        currentAdminFlag = false;
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.message, 'Customer deleted successfully');
    });
});

