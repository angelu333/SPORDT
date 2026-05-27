const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
host: process.env.DB_HOST,
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME
});

db.connect((err) => {
if (err) throw err;
console.log('Conexion exitosa a la base de datos de SporDT');
});

app.listen(process.env.PORT, () => {
console.log('Servidor corriendo en el puerto', process.env.PORT);
});