const express = require("express");
const mongoose = require("mongoose");
const { Pool } = require("pg");

const PORT = process.env.PORT || 4000;
const app = express();

// Redis Configuration
const redis = require("redis");
const redisUrl = process.env.REDIS_URL || "redis://redis:6379";
console.log("Connecting to Redis:", redisUrl);

const redisclient = redis.createClient({
  url: redisUrl
});

redisclient.on('error', err => console.log('Redis Client Error', err));
redisclient.on('connect', () => console.log('Redis Client connected successfully'));
redisclient.connect();

// MongoDB Configuration
const mongoUrl = process.env.NODE_ENV === 'production' 
  ? process.env.MONGO_URL_PROD 
  : process.env.MONGO_URL_DEV;

console.log("Environment:", process.env.NODE_ENV);
console.log("Connecting to MongoDB:", mongoUrl);

mongoose
  .connect(mongoUrl)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.log("Failed to connect to MongoDB", err));

// PostgreSQL Configuration
const postgresUrl = process.env.POSTGRES_URL || "postgresql://admin:admin@postgres:5432/myapp";
console.log("Connecting to PostgreSQL:", postgresUrl);

const pgPool = new Pool({
  connectionString: postgresUrl
});

// Test PostgreSQL connection
pgPool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('PostgreSQL connected successfully');
    release();
  }
});

app.use(express.json());

// Home route with Redis
app.get("/", async (req, res) => {
  try {
    await redisclient.set('products', 'docker');
    res.send("<h1>hello test node js with docker test live with aws</h1>");
  } catch (error) {
    console.log('Redis set error:', error);
    res.send("<h1>hello test node js with docker test live with aws</h1>");
  }
});

// Redis data route
app.get("/data", async (req, res) => {
  try {
    const products = await redisclient.get('products');
    res.send(`<h1>hello test node js with docker test live with data from aws${products}</h1>`);
  } catch (error) {
    console.log('Redis get error:', error);
    res.send('<h1>Error getting data from Redis</h1>');
  }
});

// PostgreSQL routes
app.get("/users", async (req, res) => {
  try {
    const result = await pgPool.query('SELECT * FROM users ORDER BY id DESC LIMIT 10');
    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.log('PostgreSQL get error:', error);
    res.json({
      success: false,
      message: 'Error getting users from PostgreSQL',
      error: error.message
    });
  }
});

app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    const result = await pgPool.query(
      'INSERT INTO users (name, email, created_at) VALUES ($1, $2, NOW()) RETURNING *',
      [name, email]
    );
    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.log('PostgreSQL insert error:', error);
    res.json({
      success: false,
      message: 'Error creating user in PostgreSQL',
      error: error.message
    });
  }
});

// Create users table if not exists
app.get("/init-db", async (req, res) => {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    res.json({
      success: true,
      message: 'Users table created successfully'
    });
  } catch (error) {
    console.log('PostgreSQL table creation error:', error);
    res.json({
      success: false,
      message: 'Error creating table',
      error: error.message
    });
  }
});

// Health check for all services
app.get("/health", async (req, res) => {
  const health = {
    mongodb: false,
    redis: false,
    postgresql: false
  };

  try {
    // Check MongoDB
    if (mongoose.connection.readyState === 1) {
      health.mongodb = true;
    }

    // Check Redis
    if (redisclient.isOpen) {
      health.redis = true;
    }

    // Check PostgreSQL
    const pgClient = await pgPool.connect();
    await pgClient.query('SELECT 1');
    pgClient.release();
    health.postgresql = true;
  } catch (error) {
    console.log('Health check error:', error);
  }

  res.json({
    status: 'running',
    services: health,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`App is up and running on port: ${PORT}`);
});