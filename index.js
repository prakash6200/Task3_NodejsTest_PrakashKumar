require("./config/db.config");
const cors = require("cors");
const express = require("express");
const router = require("./router/router");
const config = require("./config/config");
const fs = require("fs");
const crypto = require("crypto");
const winston = require("winston");
require("winston-daily-rotate-file");

const app = express();
const http = require("http");
const server = http.createServer(app);

// Tamper-resistant log file setup
const logDirectory = "./logs";

// Ensure the log directory exists
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

// Create a rotating file transport for Winston
const logTransport = new winston.transports.DailyRotateFile({
    dirname: logDirectory,
    filename: "app-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: false,
    maxSize: "10m",
    maxFiles: "30d",
});

// Set up Winston logger
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json() // Use JSON for structured logs
    ),
    transports: [
        logTransport,
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
    ],
});

// Middleware to log every incoming request
app.use((req, res, next) => {
    logger.info({
        message: "Incoming request",
        method: req.method,
        url: req.url,
        ip: req.ip,
    });
    next();
});

// Middleware and routing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/", router);

app.use((req, res) => {
    res.type("text/plain");
    res.status(404).send({ success: true, message: "Server is Working." });
});

// Periodically hash log files for tamper detection
const hashLogFiles = () => {
    fs.readdir(logDirectory, (err, files) => {
        if (err) {
            console.error("Error reading log directory:", err);
            return;
        }

        files.forEach((file) => {
            const filePath = `${logDirectory}/${file}`;
            const hash = crypto.createHash("sha256");
            const fileStream = fs.createReadStream(filePath);

            fileStream.on("data", (chunk) => hash.update(chunk));
            fileStream.on("end", () => {
                const checksum = hash.digest("hex");
                fs.writeFileSync(
                    `${filePath}.hash`,
                    checksum,
                    "utf8"
                ); // Save the hash in a separate file
                console.log(`Hash saved for log file: ${file}`);
            });
        });
    });
};

// Run the hashing process periodically (e.g., every hour)
setInterval(hashLogFiles, 60 * 60 * 1000); // 1 hour in milliseconds

// Start server
server.listen(config.PORT, () => {
    logger.info(`App running on http://localhost:${config.PORT}`);
});
