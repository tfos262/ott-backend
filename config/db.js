import mysql from 'mysql2/promise';

const Connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'ott', // Replace with your actual database name
    // waitfForConnections: true,
    // connectionLimit: 10,
    // queueLimit: 0   
})
export default Connection;

// // Azure MySQL connection example

// var fs = require('fs');
// var mysql = require('mysql');
// const serverCa = [fs.readFileSync("/var/www/html/DigiCertGlobalRootCA.crt.pem", "utf8")];
// var conn=mysql.createConnection({
//     host:"mydemoserver.mysql.database.azure.com",
//     user:"myadmin",
//     password:"yourpassword",
//     database:"quickstartdb",
//     port:3306,
//     ssl: {
//         rejectUnauthorized: true,
//         ca: serverCa
//     }
// });
// conn.connect(function(err) {
//   if (err) throw err;
// });