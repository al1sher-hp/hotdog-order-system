import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MijozSavat.css';

function MijozSavat() {
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        // Check if customer name exists
        const customerName = localStorage.getItem('customerName');
        if (!customerName) {
            navigate('/');
            return;
        }

        // Load cart from localStorage
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            setCart(JSON.parse(savedCart));
        }
    }, [navigate]);

    const updateQuantity = (itemId, delta) => {
        const newCart = cart.map(item => {
            if (item._id === itemId) {
                const newQuantity = item.quantity + delta;
                return { ...item, quantity: Math.max(0, newQuantity) };
            }
            return item;
        }).filter(item => item.quantity > 0);

        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
    };

    const removeItem = (itemId) => {
        const newCart = cart.filter(item => item._id !== itemId);
        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const handleOrder = async () => {
        if (cart.length === 0) {
            setError('Savat bo\'sh!');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const customerName = localStorage.getItem('customerName');
            const items = cart.map(item => ({
                _id: item._id,
                quantity: item.quantity
            }));

            const response = await axios.post('/api/create-order', {
                ism: customerName,
                items
            });

            // Save QR code and order ID
            localStorage.setItem('qrCode', response.data.qrCode);
            localStorage.setItem('orderId', response.data.orderId);

            // Clear cart
            localStorage.removeItem('cart');

            // Navigate to QR page
            navigate('/qr');
        } catch (error) {
            console.error('Buyurtma berish xatosi:', error);
            setError(error.response?.data?.error || 'Buyurtma berishda xato yuz berdi');
            setLoading(false);
        }
    };

    const goBack = () => {
        navigate('/menu');
    };

    return (
        <div className="mijoz-savat-container">
            <div className="savat-card">
                <h1>Savat</h1>

                {cart.length === 0 ? (
                    <div className="empty-cart">
                        <p>Savat bo'sh</p>
                        <button className="btn btn-primary" onClick={goBack}>
                            Menuga qaytish
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="cart-items">
                            {cart.map((item) => (
                                <div key={item._id} className="cart-item">
                                    <div className="cart-item-info">
                                        <h3>{item.name}</h3>
                                        <p className="cart-item-price">
                                            {item.price.toLocaleString()} so'm × {item.quantity}
                                        </p>
                                    </div>

                                    <div className="cart-item-actions">
                                        <div className="quantity-controls">
                                            <button
                                                className="btn-quantity"
                                                onClick={() => updateQuantity(item._id, -1)}
                                            >
                                                -
                                            </button>
                                            <span className="quantity-display">{item.quantity}</span>
                                            <button
                                                className="btn-quantity"
                                                onClick={() => updateQuantity(item._id, 1)}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            className="btn btn-danger btn-small"
                                            onClick={() => removeItem(item._id)}
                                        >
                                            O'chirish
                                        </button>
                                    </div>

                                    <div className="cart-item-total">
                                        {(item.price * item.quantity).toLocaleString()} so'm
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="cart-summary">
                            <div className="total-row">
                                <span className="total-label">Jami:</span>
                                <span className="total-amount">
                                    {calculateTotal().toLocaleString()} so'm
                                </span>
                            </div>

                            {error && <div className="error-message">{error}</div>}

                            <div className="cart-buttons">
                                <button className="btn btn-primary" onClick={goBack}>
                                    Menuga qaytish
                                </button>
                                <button
                                    className="btn btn-success"
                                    onClick={handleOrder}
                                    disabled={loading}
                                >
                                    {loading ? 'Yuklanmoqda...' : 'Buyurtma berish'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default MijozSavat;
