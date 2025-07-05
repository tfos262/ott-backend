// services/squareService.js
import crypto from 'crypto';
import { Client, Environment } from 'square/legacy';

const squareClient = new Client({
  bearerAuthCredentials: {
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
  },
  environment: Environment.Sandbox,
});

export async function createPayment(nonce, amount, locationId) {
  return await squareClient.paymentsApi.createPayment({
    sourceId: nonce,
    amountMoney: {
      amount: parseInt(amount),
      currency: 'USD',
    },
    idempotencyKey: crypto.randomUUID(),
    locationId,
  });
}

export async function verifyPayment(paymentId) {
  const { result } = await squareClient.paymentsApi.getPayment(paymentId);
  return result.payment;
}