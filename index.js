require("./config/db.config");
const cors = require("cors");
const morgan = require("morgan");
const express = require("express");
const router = require("./router/router");
const config = require("./config/config");

const app = express();
const http = require("http");
const server = http.createServer(app);

// Morgan logging setup
app.use(morgan("combined"));

// Middleware and routing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use("/", router);

app.use((req, res) => {
    res.type("text/plain");
    res.status(404).send({ success: true, message: "Server is Working." });
});

// Start server and monitor integrity
server.listen(config.PORT, () => {
    console.log(`App running on http://localhost:${config.PORT}`);
});
