const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const utils = require("../utilities/otp");
const config = require("../config/config");
const UserModel = require("../models/users.model");
const JwtTokenModel = require("../models/jwtToken.model");
const LoginAttemptModel = require("../models/loginAttempts.model");
const { getUniqueUserReferralCode } = require("../services/services");
const { handleErrorResponse, CustomErrorHandler } = require("../middleware/CustomErrorHandler");

module.exports.signUp = async (request, response) => {
    try {
        const { referral, name, mobile, password, cnfPassword, dob, userName, platform } = request.body;
   
        const checkMobile = await UserModel.findOne({
            mobile: mobile.trim(),
        });
        if (checkMobile) throw CustomErrorHandler.alreadyExist("Your Mobile Is Already Registered!");

        const checkUserName = await UserModel.findOne({
            userName: userName.trim().toLowerCase(),
        });
        if (checkUserName) throw CustomErrorHandler.alreadyExist("Your UserName Is Already Registered!");

        let checkReferral = false;
        if (referral) {
            checkReferral = await UserModel.findOne({
                referralCode: referral.trim(),
                isDeleted: false,
            });
            if (!checkReferral){
                throw CustomErrorHandler.alreadyExist("Please Enter a Valid Referral Code!");
            }
        };

        if (password !== cnfPassword) {
            throw CustomErrorHandler.wrongCredentials("Confirm password not match!");
        };

        //GENERATING PASSWORD
        const passwordSalt = await bcrypt.genSalt(config.SALT_ROUND);
        const passwordHash = await bcrypt.hash(password, passwordSalt);

        const referralCode = await getUniqueUserReferralCode();

        //CREATING USER IN MONGODB
        const newUsers = await UserModel.create({
            userName: userName.trim(),
            name: name.trim(),
            referralCode: referralCode.trim(),
            mobile: mobile.trim(),
            password: passwordHash,
            dob,
            platform,
            fromUser: checkReferral && checkReferral._id ? checkReferral._id : null,
        });

        delete newUsers.password;

        const sendData = { userData: newUsers };

        return response.status(200).json({
            status: true,
            message: "Register successfully.",
            data: sendData,
        });
    } catch (e) {
        handleErrorResponse(e, response);
    }
};

module.exports.login = async (request, response) => {
    try {
        const { mobile, password, otp } = request.body;
        const ipAddress = request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress;

        // Find user
        const userData = await UserModel.findOne({
            mobile: mobile,
            isDeleted: false,
        }).select("+password");

        // Handle non-existent user
        if (!userData) {
            await LoginAttemptModel.create({
                ip: ipAddress,
                mobile,
                reason: "User not found",
                lastAttemptAt: new Date(),
            });
            throw CustomErrorHandler.wrongCredentials("User not found!");
        }

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const failedAttempts = await LoginAttemptModel.countDocuments({
            mobile,
            lastAttemptAt: { $gte: oneHourAgo },
        });

        // Block login if failed attempts exceed 5
        if (failedAttempts >= 5) {
            throw CustomErrorHandler.unAuthorized("Too many failed login attempts. Please try again later!");
        }

        // Check user verification
        if (!userData.isMobileVerified) {
            await LoginAttemptModel.create({
                ip: ipAddress,
                mobile,
                reason: "Mobile not verified",
                lastAttemptAt: new Date(),
            });
            throw CustomErrorHandler.unAuthorized("Mobile not verified!");
        }

        // Validate password
        const checkPassword = await bcrypt.compare(password, userData.password);
        if (!checkPassword) {
            await LoginAttemptModel.create({
                ip: ipAddress,
                mobile,
                reason: "Wrong password",
                lastAttemptAt: new Date(),
            });
            throw CustomErrorHandler.wrongCredentials("Wrong Password!");
        }

        if (userData.otp == null) {
            const newOtp = utils.generateOtp();

            if (userData.platform === "TELEGRAM") {
                await utils.sendOtpOnTelegram(mobile, newOtp);
            } else {
                await utils.sendOtpOnWhatsapp(mobile, newOtp);
            }

            userData.otp = newOtp;
            userData.otpTime = new Date();
            await userData.save();

            return response.json({
                status: true,
                message: `OTP sent to ${userData.platform}`,
                data: "",
            });
        }

        if (userData.otp !== otp) {
            await LoginAttemptModel.create({
                ip: ipAddress,
                mobile,
                reason: "Wrong OTP",
                lastAttemptAt: new Date(),
            });
            throw CustomErrorHandler.wrongCredentials("Wrong OTP!");
        }

        // Check OTP expiration (e.g., valid for 10 minutes)
        const otpExpiryTime = 10 * 60 * 1000; // 10 minutes in milliseconds
        const timeElapsed = Date.now() - new Date(userData.otpTime).getTime();

        if (timeElapsed > otpExpiryTime) {
            await LoginAttemptModel.create({
                ip: ipAddress,
                mobile,
                reason: "OTP expired",
                lastAttemptAt: new Date(),
            });
            throw CustomErrorHandler.wrongCredentials("OTP has expired. Please request a new OTP.");
        }

        userData.otp = null; // Clear the OTP after successful verification
        userData.otpTime = null; // Clear the OTP timestamp

        // Update user login timestamp
        userData.lastLogin = Math.floor(Date.now() / 1000);
        await userData.save();

        // Sanitize user data for the response
        const sanitizedUserData = { ...userData.toObject() };
        delete sanitizedUserData.password;

        // Generate JWT token
        const token = jwt.sign(JSON.stringify(sanitizedUserData), config.JWT_AUTH_TOKEN);

        await JwtTokenModel.create({
            userId: userData._id,
            token,
        });

        // Log successful login attempt
        await LoginAttemptModel.create({
            ip: ipAddress,
            mobile,
            reason: "Login successful",
            lastAttemptAt: new Date(),
        });

        console.log("Login success.");
        return response.json({
            status: true,
            message: "Login success.",
            data: { sendData: { ...userData.toObject(), password: undefined }, token },
        });
    } catch (e) {
        console.log("Login failed.");
        handleErrorResponse(e, response);
    }
};

module.exports.logout = async (request, response) => {
    try {
        const { user } = request.body;
        const token = request.headers.authorization;

        await JwtTokenModel.findOneAndUpdate(
            { userId: user._id, token },
            { isRevoked: true },
            { new: true }
        );

        return response.status(200).json({
            status: true,
            message: "Logout successful. Token invalidated.",
            data: null,
        });
    } catch (e) {
        handleErrorResponse(e, response);
    }
};

module.exports.sendOtp = async (request, response) => {
    try {
        const { mobile } = request.body;

        const userData = await UserModel.findOne({
            mobile,
            isDeleted: false,
        })

        if (!userData) {
            throw CustomErrorHandler.wrongCredentials("Mobile not found!");
        };

        const newOtp = utils.generateOtp();
        userData.otp = newOtp;
        userData.otpTime = new Date();

        if(userData.platform === "TELEGRAM"){
           await utils.sendOtpOnTelegram(mobile, newOtp);
        } else {
            await utils.sendOtpOnWhatsapp(mobile, newOtp);
        }
        
        await userData.save();

        const message = userData.platform == "TELEGRAM" ? "Otp send on Telegram.": "Otp send on Whatsapp.";
        
        return response.status(200).json({
            status: true,
            message,
            data: "",
        });
    } catch (e) {
        handleErrorResponse(e, response);
    }
};

module.exports.verifyOtp = async (request, response) => {
    try {
        const { mobile, otp } = request.body;

        // Find user
        const userData = await UserModel.findOne({
            mobile: mobile,
            isDeleted: false,
        });

        if (!userData) {
            throw CustomErrorHandler.wrongCredentials("Mobile not found!");
        }

        // Check if OTP matches
        if (userData.otp !== otp) {
            throw CustomErrorHandler.wrongCredentials("Wrong OTP!");
        }

        // Check OTP expiration (e.g., valid for 10 minutes)
        const otpExpiryTime = 10 * 60 * 1000; // 10 minutes in milliseconds
        const timeElapsed = Date.now() - new Date(userData.otpTime).getTime();

        if (timeElapsed > otpExpiryTime) {
            throw CustomErrorHandler.wrongCredentials("OTP expired!");
        }

        // Mark mobile as verified
        userData.isMobileVerified = true;
        userData.otp = null; // Clear the OTP after successful verification
        userData.otpTime = null; // Clear the OTP timestamp
        await userData.save();

        return response.status(200).json({
            status: true,
            message: "Mobile verified successfully.",
            data: "",
        });
    } catch (e) {
        handleErrorResponse(e, response);
    }
};