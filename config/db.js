import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
// import fs from 'fs';

dotenv.config();
// // Azure MySQL connection example

// var fs = require('fs');
// var mysql = require('mysql');
// const serverCa = [fs.readFileSync("/var/www/html/DigiCertGlobalRootCA.crt.pem", "utf8")];
export async function createDbConnection() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306,
    // ssl: optional, uncomment for Azure
    // ssl: {
    //   rejectUnauthorized: true,
    //   ca: [fs.readFileSync('/path/to/ca.pem', 'utf8')]
    // }
  });

  return conn;
}