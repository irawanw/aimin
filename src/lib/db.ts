import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'aimin',
  password: 'bzYG+5Fz5bQJR+tT',
  database: 'aimin',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
