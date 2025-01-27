const jwt = require("jsonwebtoken");
const config = require("./../config/config");
const JwtTokenModel = require("../models/jwtToken.model");

module.exports.verifyJWTToken = async(request, response, next) => {
    try {
        const token = request.headers.authorization;
        if (!token) {
            return response
                .status(403)
                .json({
                    status: false,
                    message: "Token Not found!",
                    data: null,
                });
        } else {
            // check token is revoked 

            const checkToken = await JwtTokenModel.findOne({ token });

            if (!checkToken || checkToken.isRevoked) {
                return response
                    .status(401)
                    .json({
                        status: false,
                        message: "Token Revoked!",
                        data: null,
                    });
            }

            jwt.verify(token, config.JWT_AUTH_TOKEN, async (err, result) => {
                if (err) {
                    return response
                        .status(401)
                        .json({
                            status: false,
                            message: "You are Not Authorize",
                            data: null,
                        });
                } else {
                    if (result) {
                        request.body.user = result;
                        return next();
                    } else {
                        return response
                            .status(401)
                            .json({
                                status: false,
                                message: "Invalid token or expired!",
                                data: null,
                            });
                    }
                }
            });
        }
    } catch (e) {
        return response
            .status(500)
            .json({
                status: false,
                message: "Invalid token or expired!",
                data: null,
            });
    }
};

module.exports.refreshToken = (request, response) => {
    try {
        const authHeader = request.headers.authorization;

        // Check if token is provided
        if (!authHeader) {
            return response.status(400).json({
                status: false,
                message: "No token provided.",
                data: null,
            });
        }

        // Handle "Bearer" prefix in the token
        const token = authHeader.startsWith("Bearer ") 
            ? authHeader.split(" ")[1] 
            : authHeader;

        // Verify and decode the token
        const decoded = jwt.verify(token, config.JWT_AUTH_TOKEN);

        // Validate required claims
        if (!decoded.id || !decoded.role) {
            return response.status(401).json({
                status: false,
                message: "Token is missing required claims.",
                data: null,
            });
        }

        // Generate a new token
        const newToken = jwt.sign(
            { id: decoded.id, role: decoded.role },
            config.JWT_AUTH_TOKEN,
            { expiresIn: "15m" } // New expiration time
        );

        return response.status(200).json({
            status: true,
            message: "Token refreshed successfully.",
            data: { token: newToken },
        });
    } catch (e) {
        const message = e.name === "TokenExpiredError"
            ? "Token has expired."
            : "Invalid token.";
        
        return response.status(401).json({
            status: false,
            message,
            data: null,
        });
    }
};
