// backend/routes/auth.routes.js

const express = require('express');
const axiosInstance = require('../config/axios.config');
const { LOGIN_URL } = require('../config/constants');

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const response = await axiosInstance.post(LOGIN_URL, {
            Username: username,
            Password: password,
            SecurityCode: "",
            ReCaptchaResponse: null
        });

        if (response.status === 200) {
            return res.json({
                success: true,
                message: 'Login successful',
                username: username,
                data: response.data
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        return res.status(401).json({
            success: false,
            message: 'Login failed. Please check your credentials.'
        });
    }
});

module.exports = router;