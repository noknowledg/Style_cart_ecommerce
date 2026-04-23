const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail(to, subject, text) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text
  });
}

module.exports = sendEmail;

exports.verifyOTP = async (req, res) => {

  try {

    const { otp, otpToken } = req.body;

    const decoded = jwt.verify(otpToken, process.env.JWT_SECRET);

    const verified = speakeasy.totp.verify({
      secret: decoded.otpSecret,
      encoding: "base32",
      token: otp,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // get role
    const [roleRows] = await pool.query(
      `SELECT r.role_name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [decoded.id]
    );

    const role = roleRows[0].role_name;

    // create login JWT
    const token = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        role: role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // password age check
    const [userData] = await pool.query(
      "SELECT password_changed_at FROM users WHERE id=?",
      [decoded.id]
    );

    const lastChanged = new Date(userData[0].password_changed_at);
    const days = (Date.now() - lastChanged) / (1000 * 60 * 60 * 24);

    let passwordWarning = null;

    if (days >= 7) {
      passwordWarning = "You must change your password";
    }

    res.json({
      message: "Login successful",
      token,
      role,
      passwordWarning
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "OTP verification failed"
    });

  }

};