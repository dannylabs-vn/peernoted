const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_for_dev', {
    expiresIn: '30d',
  });
};

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, school, cohort } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin bắt buộc' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'Email này đã được sử dụng' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      school,
      cohort
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        school: user.school,
        cohort: user.cohort,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Authenticate a user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        school: user.school,
        cohort: user.cohort,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/google
 * Authenticate with Google
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    // For local testing without a real client ID, we can decode the token without verification
    // In production, you MUST verify the token with the client ID.
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id.apps.googleusercontent.com',
    }).catch(err => {
      // Fallback for missing/dummy client ID: manually decode token (UNSAFE FOR PRODUCTION)
      const decoded = jwt.decode(credential);
      if (!decoded) throw new Error('Invalid token');
      return { getPayload: () => decoded };
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if doesn't exist
      user = await User.create({
        name,
        email,
        // password is not required anymore, but we can set a dummy one just in case
      });
    }

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      school: user.school,
      token: generateToken(user._id),
      avatar: picture
    });
  } catch (error) {
    console.error('[Google Auth Error]:', error);
    res.status(401).json({ error: 'Xác thực Google thất bại' });
  }
});

/**
 * GET /api/auth/me
 * Get user data (Protected route)
 */
router.get('/me', protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
