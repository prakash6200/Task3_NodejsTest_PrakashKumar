const UserModel = require("../models/users.model");

function generateRandomString(length) {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength),
        );
    }
    return result;
}

async function getUniqueUserReferralCode(referral) {
    return new Promise(async (resolve) => {
        const ref = referral ? referral : generateRandomString(8);

        referralExists = await UserModel.findOne({
            referralCode: ref,
        });

        if (!referralExists) {
            resolve(ref);
        } else {
            await getUniqueUserReferralCode(generateRandomString(8));
        }
    });
}

module.exports.getUniqueUserReferralCode = getUniqueUserReferralCode;
