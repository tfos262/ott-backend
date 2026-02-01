import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let conn;

export function createDbConnection() {
  if (!conn) {
    if (!process.env.DB_CA_CERT) {
      throw new Error('DB_CA_CERT is required for Aiven MySQL');
    }

    conn = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,

      connectionLimit: 5,
      waitForConnections: true,
      queueLimit: 0,

      ssl: {
        rejectUnauthorized: true,
        ca: process.env.DB_CA_CERT
      }
    });
  }

  return conn;
}
