const { v4: uuidv4 } = require("uuid");
const mysql = require("mysql2/promise");

function createLogger({ dbConfig, maliciousIpCheckInterval = 60 }) {
    if (!dbConfig) {
        throw new Error("Database configuration is required.");
    }

    // Create the connection pool
    const pool = mysql.createPool(dbConfig);

    // In-memory structure to store malicious IPs
    let maliciousIps = new Set();
    let checkIntervalInSeconds = maliciousIpCheckInterval;

    // Function to get the current UTC datetime
    const getUtcDate = () => new Date().toISOString().slice(0, 19).replace("T", " ");

    // Function to load the interval time from the database
    const loadCheckInterval = async () => {
        try {
            const [rows] = await pool.execute(
                "SELECT `Value` FROM Configurations WHERE `Key` = 'MaliciousIpCheckIntervalInSeconds' LIMIT 1"
            );
            if (rows.length > 0) {
                checkIntervalInSeconds = parseInt(rows[0].Value, 10) || 60;
            }
        } catch (error) {
            console.error("Error loading check interval:", error.message);
        }
    };

    // Function to load malicious IPs from the database
    const loadMaliciousIps = async () => {
        try {
            const [rows] = await pool.execute(
                "SELECT IpAddress FROM BlacklistedIps WHERE IsActive = true"
            );
            maliciousIps = new Set(rows.map((row) => row.IpAddress));
            console.log("Malicious IPs updated:", maliciousIps);
        } catch (error) {
            console.error("Error loading malicious IPs:", error.message);
        }
    };

    // Middleware to log requests and responses
    const loggerMiddleware = async (req, res, next) => {
        const requestId = uuidv4();
        const requestStartTime = process.hrtime();
        let responseBody = "";

        const originalSend = res.send.bind(res);
        res.send = (body) => {
            responseBody = typeof body === "string" ? body : JSON.stringify(body);
            return originalSend(body);
        };

        try {
            await pool.execute(
                `INSERT INTO RequestLogs (
                    RequestId, HttpMethod, RequestPath, QueryString, ClientIp, UserAgent, RequestTime, HttpVersion
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    requestId,
                    req.method,
                    req.path,
                    req.query ? JSON.stringify(req.query) : null,
                    req.ip,
                    req.headers["user-agent"] || null,
                    getUtcDate(),
                    req.httpVersion,
                ]
            );
        } catch (error) {
            console.error("Error storing request log:", error.message);
        }

        res.on("finish", async () => {
            const responseTime = process.hrtime(requestStartTime);
            const durationMs = responseTime[0] * 1000 + responseTime[1] / 1e6;

            try {
                await pool.execute(
                    `INSERT INTO ResponseLogs (
                        RequestId, StatusCode, ResponseHeaders, ResponseTime, DurationMs, ServerIp, ResponseSizeInBytes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        requestId,
                        res.statusCode,
                        JSON.stringify(res.getHeaders()),
                        getUtcDate(),
                        Math.round(durationMs),
                        req.hostname,
                        Buffer.byteLength(responseBody),
                    ]
                );
            } catch (error) {
                console.error("Error storing response log:", error.message);
            }
        });

        next();
    };

    // Middleware to block malicious IPs
    const ipBlockerMiddleware = (req, res, next) => {
        if (maliciousIps.has(req.ip)) {
            return res.status(403).send("Forbidden: Your IP is blocked.");
        }
        next();
    };

    // Initialize the logger
    const initialize = async () => {
        await loadCheckInterval();
        await loadMaliciousIps();
        setInterval(loadMaliciousIps, checkIntervalInSeconds * 1000);
    };

    return {
        initialize,
        loggerMiddleware,
        ipBlockerMiddleware,
    };
}

module.exports = createLogger;
