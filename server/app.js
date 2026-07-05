require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100 // 100 requests per minute
});
app.use('/api/', limiter);

// Make io accessible to routes
app.set('io', io);

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const menuRoutes = require('./routes/menu');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api', orderRoutes);
app.use('/api', menuRoutes);
app.use('/api/admin', adminRoutes);


// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(async () => {
        console.log('MongoDB ga ulandi');

        // Create default admin user if doesn't exist
        const User = require('./models/User');
        const adminExists = await User.findOne({ username: 'boshliq' });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                username: 'boshliq',
                password: hashedPassword,
                role: 'admin',
                mustChangePassword: true
            });
            await admin.save();
            console.log('Default admin yaratildi: boshliq / admin123');
        }
    })
    .catch(err => {
        console.log('MongoDB ulanish xatosi:', err);
        process.exit(1);
    });

// Socket.io connection
io.on('connection', (socket) => {
    console.log('Yangi mijoz ulandi');

    socket.on('disconnect', () => {
        console.log('Mijoz uzildi');
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Xato yuz berdi' });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server ${PORT} portda ishlamoqda`);
});

