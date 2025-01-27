
module.exports.sendOtpOnWhatsapp = async (mobile, otp) => {
    try {
        console.log(`Otp send on Whatsapp ${mobile} and otp is ${otp}`);
        
        // Implement api for send mobile otp
        return true;
    } catch (err) {
        return false;
    }
};

module.exports.sendOtpOnTelegram = async (mobile, otp) => {
    try {
        console.log(`Otp send on Telegram ${mobile} and otp is ${otp}`);

        // Implement the telegram api to send otp
        return true;
    } catch (err) {
        return false;
    }
};

module.exports.generateOtp = () => {
    return (Math.floor(1000 + Math.random() * 9000)).toString();
};
