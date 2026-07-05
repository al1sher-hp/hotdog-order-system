import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './Ekran.css';

function Ekran() {
    const [preparingOrders, setPreparingOrders] = useState([]);
    const [readyOrders, setReadyOrders] = useState([]);

    const fetchOrders = useCallback(async () => {
        try {
            const response = await axios.get('/api/active-orders');
            const orders = response.data;

            const preparing = orders.filter(o => o.status === 'tayyorlanmoqda');
            const ready = orders.filter(o => o.status === 'tayyor');

            setPreparingOrders(preparing);
            setReadyOrders(ready);
        } catch (error) {
            console.error('Fetch orders error:', error);
        }
    }, []);

    useEffect(() => {
        // Fetch initial orders
        fetchOrders();

        // Setup Socket.io
        const socket = io('http://localhost:5000');
        socket.on('order-update', () => {
            fetchOrders();
        });

        return () => {
            socket.disconnect();
        };
    }, [fetchOrders]);

    return (
        <div className="ekran-container">
            <div className="ekran-column preparing-column">
                <h1 className="ekran-title preparing-title">TAYYORLANMOQDA</h1>
                <div className="orders-list">
                    {preparingOrders.length === 0 ? (
                        <p className="empty-message">Hozircha buyurtma yo'q</p>
                    ) : (
                        preparingOrders.map((order, index) => (
                            <div key={order.id} className="order-display-card preparing-card">
                                <span className="order-name">{order.ism}</span>
                                <span className="order-display-number">#{index + 1}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="ekran-column ready-column">
                <h1 className="ekran-title ready-title">TAYYOR</h1>
                <div className="orders-list">
                    {readyOrders.length === 0 ? (
                        <p className="empty-message">Hozircha buyurtma yo'q</p>
                    ) : (
                        readyOrders.map((order, index) => (
                            <div key={order.id} className="order-display-card ready-card fade-in">
                                <span className="order-name">{order.ism}</span>
                                <span className="order-display-number">#{index + 1}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

export default Ekran;
