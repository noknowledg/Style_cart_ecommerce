const commonPasswords = ["123456", "password", "qwerty", "admin123", "welcome"];

function calculatePasswordStrength(password) {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++; 
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return "Weak";
  if (score === 3 || score === 4) return "Medium";
  return "Strong";
}

function validatePassword(password) {
  const errors = [];

  if (!password) errors.push("Password is required");

  if (password.length < 8)
    errors.push("Password must be at least 8 characters");

  if (!/[a-z]/.test(password))
    errors.push("Password must contain a lowercase letter (a-z)");

  if (!/[A-Z]/.test(password))
    errors.push("Password must contain an uppercase letter (A-Z)");

  if (!/[0-9]/.test(password))
    errors.push("Password must contain a number (0-9)");

  if (!/[^A-Za-z0-9]/.test(password))
    errors.push("Password must contain a special character '!@.#$%^&*()'");

  if (commonPasswords.includes(password.toLowerCase()))
    errors.push("Password is too common");

  return {
    valid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
}

module.exports = {
  validatePassword,
  calculatePasswordStrength
};