import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';
import { dbConfig } from '../constants.js';

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const db = {
  // Basic query
  async query(sql, args) {
    try {
      const [rows] = await pool.query(sql, args);
      return rows;
    } catch (err) {
      console.error('❌ DB Query Error:', err);
      throw err;
    }
  },

  // Begin transaction
  async begin() {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      return connection;
    } catch (err) {
      connection.release();
      throw err;
    }
  },

  // Commit transaction
  async commit(connection) {
    try {
      await connection.commit();
    } catch (err) {
      await connection.rollback(); // rollback on commit error
      throw err;
    } finally {
      connection.release();
    }
  },

  // Rollback transaction
  async rollback(connection) {
    try {
      await connection.rollback();
    } finally {
      connection.release();
    }
  },

  // Close pool
  async close() {
    console.log("🔌 Closing DB pool");
    await pool.end();
  },
};

export const connectDB = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ DB connected");
  } catch (err) {
    console.error("❌ DB connection failed:", err);
    throw err;
  }
};

export default db;
