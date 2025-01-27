const express = require("express");
const router = express.Router();

const adminController = require("../controller/admin.controller");
const adminValidator = require("../validator/admin.validator");

const { verifyJWTToken } = require("../middleware/jwt.middleware");

router.get("/userList", adminValidator.userList, verifyJWTToken,  adminController.userList);
router.get("/user/:id", adminValidator.userById, verifyJWTToken, adminController.userById);

module.exports = router;