const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// Login route
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username va parol kiritilishi shart' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Noto\'g\'ri username yoki parol' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Noto\'g\'ri username yoki parol' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, role: user.role, username: user.username, mustChangePassword: user.mustChangePassword });
    } catch (error) {
        console.log('Login error:', error);
        res.status(500).json({ error: 'Xato yuz berdi' });
    }
});

// Verify token
router.get('/verify', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

// Change password (required on first login for default admin, usable anytime)
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Joriy va yangi parol kiritilishi shart' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Yangi parol kamida 6 belgidan iborat bo\'lishi kerak' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Joriy parol noto\'g\'ri' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.mustChangePassword = false;
        await user.save();

        res.json({ success: true });
    } catch (error) {
        console.log('Change password error:', error);
        res.status(500).json({ error: 'Xato yuz berdi' });
    }
});

module.exports = router;
