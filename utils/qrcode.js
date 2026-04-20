const QRCode = require('qrcode');

exports.generateQRCode = async (text) => {
    try {
        return await QRCode.toDataURL(text);
    } catch (err) {
        console.error(err);
        return null;
    }
};