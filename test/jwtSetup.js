import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();


function generateTestToken(isAdmin = false) {
  return jwt.sign(
    { customer_id: 1, admin: isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

export { generateTestToken };