const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { validatePassword } = require("../password");
const fs = require('fs');
const path = require('path');
const axios = require("axios");
const sendEmail = require("../utils/sendEmail");
const speakeasy = require("speakeasy");
const jwt = require("jsonwebtoken");
const AuditLogger = require("../utils/auditLogger");


function logRegistration(email, status, reason = '', ip = '') {
  const logDir = path.join(__dirname, '../logs');
  const logFile = path.join(logDir, 'registration.log');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logLine = `${new Date().toISOString()} | ${email} | ${status} | ${reason} | IP: ${ip}\n`;
  fs.appendFileSync(logFile, logLine, 'utf8');
}

exports.register = async (req, res) => {
  try {

    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phone,
      address,
      captchaToken
    } = req.body;
     const userIP = req.ip || req.connection.remoteAddress;
const axios = require("axios");

if (!captchaToken) {
  return res.status(400).json({ message: "CAPTCHA token is missing" });
}

const secretKey = process.env.RECAPTCHA_SECRET;

const response = await axios.post(
  `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`
);
console.log("CAPTCHA response:", response.data);
if (!response.data.success) {
  return res.status(400).json({ message: "CAPTCHA verification failed" });
}

    //  Check empty fields
    if (!firstName || !lastName || !email || !password || !confirmPassword || !phone || !address) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    //  Email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Invalid email format"
      });
    }

    //  Confirm password match
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match"
      });
    }

    // Password validation
    const passwordCheck = validatePassword(password);

    if (!passwordCheck.valid) {
      return res.status(400).json({
        message: "Weak password",
        errors: passwordCheck.errors,
        strength: passwordCheck.strength
      });
    }

    //  Check existing email
    const [emailCheck] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (emailCheck.length > 0) {
      logRegistration(email, 'Failed', 'Email already registered', userIP);
      return res.status(400).json({
        message: "Email already registered"
      });
    }

    //  Check existing phone
    const [phoneCheck] = await pool.query(
      "SELECT id FROM users WHERE phone = ?",
      [phone]
    );

    if (phoneCheck.length > 0) {
      return res.status(400).json({
        message: "Phone number already registered"
      });
    }

    //  Hash password

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const insertResult = await pool.query(
  `INSERT INTO users
  (first_name, last_name, email, password_hash, phone, address)
  VALUES (?, ?, ?, ?, ?, ?)`,
  [firstName, lastName, email, hashedPassword, phone, address]
);

// Get new user id
const userId = insertResult[0].insertId; // 

// Get consumer role id
const [roleRows] = await pool.query(
  'SELECT id FROM roles WHERE role_name = ?',
  ['consumer']
);
const consumerRoleId = roleRows[0].id;

//  Assign consumer role
await pool.query(
  'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
  [userId, consumerRoleId]
);
    // Log success
    logRegistration(email, 'Success', '', userIP);



    res.status(201).json({
      message: "User registered successfully",
      passwordStrength: passwordCheck.strength
    });

  } catch (error) {

    console.error(error);
     logRegistration(req.body.email || 'Unknown', 'Failed', 'Server error', );
    res.status(500).json({ message: 'Server error' });

   
  }
  
};


exports.login = async (req, res) => {
  try {

    const { email, password } = req.body;

    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      await AuditLogger.logAuth(req, 'LOGIN_FAILED', 'User not found');
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = users[0];

    //  Check account lock
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      await AuditLogger.logAuth(req, 'LOGIN_FAILED', 'Account locked', user.id);
      return res.status(403).json({
        message: "Account locked. Try again later."
      });
    }

    //  Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {

      const attempts = user.failed_attempts + 1;

      if (attempts >= 5) {

        const lockTime = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock

        await pool.query(
          "UPDATE users SET failed_attempts=?, account_locked_until=? WHERE id=?",
          [attempts, lockTime, user.id]
        );

        await AuditLogger.logAuth(req, 'LOGIN_FAILED', 'Too many failed attempts - account locked', user.id);
        return res.status(403).json({
          message: "Too many failed attempts. Account locked for 15 minutes."
        });
      }

      await pool.query(
        "UPDATE users SET failed_attempts=? WHERE id=?",
        [attempts, user.id]
      );

      await AuditLogger.logAuth(req, 'LOGIN_FAILED', 'Invalid password', user.id);
      return res.status(401).json({
        message: "Invalid credentials"
      });
    }

    // reset attempts if correct
    await pool.query(
      "UPDATE users SET failed_attempts=0 WHERE id=?",
      [user.id]
    );

    //  Generate OTP (NOT stored in DB)
    const secret = speakeasy.generateSecret();

    const otp = speakeasy.totp({
      secret: secret.base32,
      encoding: "base32",
      step: 300
    });

    // send OTP
    await sendEmail(
      email,
      "Your Login OTP",
      `Your OTP is ${otp}. It expires in 5 minutes.`
    );

    // temporary token for OTP verification
    const otpToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        otpSecret: secret.base32
      },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    res.json({
      message: "OTP sent to your email",
      otpToken
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Server error"
    });

  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { otp, otpToken } = req.body;

    const decoded = jwt.verify(otpToken, process.env.JWT_SECRET);

    console.log("Entered OTP:", otp);
    console.log("Secret:", decoded.otpSecret);

    const verified = speakeasy.totp.verify({
      secret: decoded.otpSecret,
      encoding: "base32",
      token: otp.trim(),  
            window: 2,
      step: 300            
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // ✅ Get role
    const [roleRows] = await pool.query(
      `SELECT r.role_name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [decoded.id]
    );

    const roles = roleRows.map(r => r.role_name);
    //  Generate login token
    const token = jwt.sign(
  {
    id: decoded.id,
    email: decoded.email,
    roles: roles  
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

    // ✅ Password age check
    const [userData] = await pool.query(
      "SELECT password_changed_at FROM users WHERE id=?",
      [decoded.id]
    );

    const lastChanged = new Date(userData[0].password_changed_at);
    const days = (Date.now() - lastChanged) / (1000 * 60 * 60 * 24);

    let passwordWarning = null;

    if (days >= 1) {
      passwordWarning = "You must change your password";
    }

   res.json({
  message: "Login successful",
  token,
  roles,   // ✅ send all roles
  passwordWarning
});

    // Log successful login
    await AuditLogger.logAuth(req, 'LOGIN_SUCCESS', `User logged in with roles: ${roles.join(', ')}`, decoded.id);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "OTP verification failed" });
  }
};