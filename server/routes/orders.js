const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const Order = require('../models/Order');
const Ingredient = require('../models/Ingredient');
const Menu = require('../models/Menu');
const { authMiddleware } = require('../middleware/auth');

// Create order (customer)
router.post('/create-order', async (req, res) => {
    try {
        const { ism, items } = req.body;

        if (!ism || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Barcha maydonlar to\'ldirilishi shart' });
        }

        const menu = await Menu.findOne();
        if (!menu) {
            return res.status(400).json({ error: 'Menyu topilmadi' });
        }

        const menuItemsById = new Map();
        menu.sections.forEach(section => {
            section.items.forEach(item => menuItemsById.set(item._id, item));
        });

        const orderItems = [];
        let total = 0;

        for (const reqItem of items) {
            const menuItem = menuItemsById.get(reqItem._id);
            if (!menuItem) {
                return res.status(400).json({ error: `Menyuda topilmadi: ${reqItem._id}` });
            }

            const quantity = parseInt(reqItem.quantity, 10);
            if (!Number.isInteger(quantity) || quantity <= 0) {
                return res.status(400).json({ error: 'Noto\'g\'ri miqdor' });
            }

            orderItems.push({
                name: menuItem.name,
                quantity,
                price: menuItem.price
            });

            total += menuItem.price * quantity;
        }

        const orderId = Date.now().toString();

        const order = new Order({
            id: orderId,
            ism,
            items: orderItems,
            total,
            status: 'pending'
        });

        await order.save();

        // Generate QR code
        const qrCode = await QRCode.toDataURL(orderId);

        res.json({ orderId, qrCode });
    } catch (error) {
        console.log('Create order error:', error);
        res.status(500).json({ error: 'Xato yuz berdi' });
    }
});

// Get order by ID (employee)
router.get('/get-order/:id', authMiddleware, async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id });

        if (!order) {
            return res.status(404).json({ error: 'Buyurtma topilmadi' });
        }

        res.json(order);
    } catch (error) {
        console.log('Get order error:', error);
        res.status(500).json({ error: 'Xato yuz berdi' });
    }
});

// Confirm order (employee - after receiving payment)
router.post('/confirm-order/:id', authMiddleware, async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id });

        if (!order) {
            return res.status(404).json({ error: 'Buyurtma topilmadi' });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({ error: 'Buyurtma allaqachon tasdiqlangan' });
        }

        order.status = 'tayyorlanmoqda';
        order.hodim_id = req.user.username;
        await order.save();

        // Update ingredients
        for (const item of order.items) {
            // This is simplified - in real app, you'd get recipe from menu
            // For now, we'll just update based on item name
            const ingredient = await Ingredient.findOne({ item_name: item.name });
            if (ingredient) {
                ingredient.remaining -= item.quantity;
                await ingredient.save();
            }
        }

        // Emit socket event (handled in app.js)
        req.app.get('io').emit('order-update', order);

        res.json({ success: true, order });
    } catch (error) {
        console.log('Confirm order error:', error);
        res.status(500).json({ error: 'Xato yuz berdi' });
    }
});

// Complete order (employee - mark as ready)
router.post('/complete-order/:id', authMiddleware, async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id });

        if (!order) {
            return res.status(404).json({ error: 'Buyurtma topilmadi' });
        }

        order.status = 'tayyor';
        await order.save();

        req.app.get('io').emit('order-update', order);

        res.json({ success: true, order });
    } catch (error) {
        console.log('Complete order error:', error);
        res.status(500).json({ error: 'Xato yuz berdi' });
    }
});

// Get active orders (for display screen)
router.get('/active-orders', async (req, res) => {
    try {
        const orders = await Order.find({
            status: { $in: ['tayyorlanmoqda', 'tayyor'] }
        }).sort({ time: 1 });

        res.json(orders);
    } catch (error) {
        console.log('Get active orders error:', error);
        res.status(500).json({ error: 'Xato yuz berdi' });
    }
});

// Mark order as given (auto-called from frontend after 60s)
router.post('/mark-as-given/:id', async (req, res) => {
    try {
        const order = await Order.findOne({ id: req.params.id });

        if (!order) {
            return res.status(404).json({ error: 'Buyurtma topilmadi' });
        }

        order.status = 'berilgan';
        await order.save();

        req.app.get('io').emit('order-update', order);

        res.json({ success: true });
    } catch (error) {
        console.log('Mark as given error:', error);
        res.status(500).json({ error: 'Xato yuz berdi' });
    }
});

// Get employee's active orders
router.get('/employee-orders', authMiddleware, async (req, res) => {
    try {
        const orders = await Order.find({
            status: 'tayyorlanmoqda'
        }).sort({ time: 1 });

        res.json(orders);
    } catch (error) {
        console.log('Get employee orders error:', error);
        res.status(500).json({ error: 'Xato yuz berdi' });
    }
});

module.exports = router;
