import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HodimLogin.css';

function HodimLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            setError('Barcha maydonlarni to\'ldiring');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/auth/login', {
                username,
                password
            });

            // Save token and user info
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userRole', response.data.role);
            localStorage.setItem('username', response.data.username);

            if (response.data.mustChangePassword) {
                setToken(response.data.token);
                setNeedsPasswordChange(true);
                setLoading(false);
                return;
            }

            // Navigate to dashboard
            navigate('/hodim/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            setError(error.response?.data?.error || 'Kirish xatosi');
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (!newPassword || newPassword !== confirmPassword) {
            setError('Yangi parollar mos emas');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await axios.post('/api/auth/change-password',
                { currentPassword: password, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            navigate('/hodim/dashboard');
        } catch (error) {
            console.error('Change password error:', error);
            setError(error.response?.data?.error || 'Parolni almashtirishda xato');
            setLoading(false);
        }
    };

    if (needsPasswordChange) {
        return (
            <div className="hodim-login-container">
                <div className="login-card">
                    <h1>Yangi parol o'rnating</h1>
                    <p>Birinchi kirishda parolni almashtirish talab qilinadi.</p>

                    <form onSubmit={handleChangePassword}>
                        <input
                            type="password"
                            className="input-field"
                            placeholder="Yangi parol"
                            value={newPassword}
                            onChange={(e) => {
                                setNewPassword(e.target.value);
                                setError('');
                            }}
                        />

                        <input
                            type="password"
                            className="input-field"
                            placeholder="Yangi parolni tasdiqlang"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setError('');
                            }}
                        />

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
                            {loading ? 'Yuklanmoqda...' : 'Parolni almashtirish'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="hodim-login-container">
            <div className="login-card">
                <h1>Hodim Kirish</h1>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value);
                            setError('');
                        }}
                    />

                    <input
                        type="password"
                        className="input-field"
                        placeholder="Parol"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                    />

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
                        {loading ? 'Yuklanmoqda...' : 'Kirish'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default HodimLogin;
