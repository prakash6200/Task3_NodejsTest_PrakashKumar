const mongoose = require("mongoose");
const { Schema } = mongoose;

const JwtToken = new Schema(
    {
        token: {
            type: String,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        isRevoked: {   // for Revoded when logOut. We can cache in redis
            type: Boolean,
            default: false,
        }
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.models.JwtToken || mongoose.model("JwtToken", JwtToken);
