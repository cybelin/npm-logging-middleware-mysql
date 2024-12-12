# http-logger-mysql

A middleware for logging HTTP requests and responses to a MySQL database.
Create the MySQL database first by executing the sql script

## Installation

```bash
npm install api-logging-middleware-mysql
```

## Usage

```javascript
import express from "express";
import { createLogger } from "api-logging-middleware-mysql"; 

const app = express();
const PORT = 3000;

// Database configuration ->
const dbConfig = {
    host: "localhost",
    user: "yourname",
    password: "yourpassword",
    database: "cybelinserver",
};


const logger = createLogger({ dbConfig, maliciousIpCheckInterval: 60 });

(async () => {
    try {
        await logger.initialize();
        console.log("Logger initialized successfully");
    } catch (error) {
        console.error("Error initializing logger:", error);
        process.exit(1);
    }
})();


app.use(express.json());
app.use(logger.loggerMiddleware); // Middleware to register logs
app.use(logger.ipBlockerMiddleware); // Middleware to block malicious IP

// Test endpoint
app.get("/test", (req, res) => {
    res.send("Test endpoint reached successfully.");
});

app.post("/data", (req, res) => {
    const { name, value } = req.body;
    res.json({ message: "Data received.", data: { name, value } });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something went wrong!");
});

// start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

