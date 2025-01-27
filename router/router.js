"use strict";
const express = require("express");
const router = express.Router();

const authRouter = require("./auth.route");
const adminRouter = require("./admin.route");

router.use("/auth", authRouter);
router.use("/admin", adminRouter);

module.exports = router;
