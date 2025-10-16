// backend/utils/helpers.js

function extractPhoneDigits(phone) {
  const digits = String(phone).replace(/[^\d]/g, "");
  if (digits.length === 11 && digits[0] === '1') {
    return digits.substring(1);
  }
  return digits;
}

module.exports = {
  extractPhoneDigits
};