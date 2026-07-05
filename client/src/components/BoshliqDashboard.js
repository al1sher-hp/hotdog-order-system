import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import './BoshliqDashboard.css';

function BoshliqDashboard() {
    const [activeTab, setActiveTab] = useState('stats');
    const [stats, setStats] = useState({ soldItems: {}, totalCash: 0 });
    const [menu, setMenu] = useState(null);
    const [users, setUsers] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    // Form states
    const [newSection, setNewSection] = useState('');
    const [newItem, setNewItem] = useState({
        sectionName: '',
        name: '',
        price: '',
        description: '',
        image: null,
        recipe: []
    });
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'hodim' });
    const [ingredientsInput, setIngredientsInput] = useState([]);

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('userRole');

        if (!token || role !== 'admin') {
            navigate('/boshliq');
            return;
        }

        // Setup axios defaults
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Fetch initial data
        fetchStats();
        fetchMenu();
        fetchUsers();
        fetchIngredients();

        // Setup Socket.io
        const socket = io('http://localhost:5000');
        socket.on('order-update', () => {
            fetchStats();
        });
        socket.on('menu-update', () => {
            fetchMenu();
        });

        return () => {
            socket.disconnect();
        };
    }, [navigate]);

    const fetchStats = async () => {
        try {
            const response = await axios.get('/api/admin/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Fetch stats error:', error);
        }
    };

    const fetchMenu = async () => {
        try {
            const response = await axios.get('/api/get-menu');
            setMenu(response.data);
        } catch (error) {
            console.error('Fetch menu error:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await axios.get('/api/admin/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Fetch users error:', error);
        }
    };

    const fetchIngredients = async () => {
        try {
            const response = await axios.get('/api/admin/ingredients');
            setIngredients(response.data);
            setIngredientsInput(response.data.map(ing => ({
                item_name: ing.item_name,
                quantity: ing.start_quantity
            })));
        } catch (error) {
            console.error('Fetch ingredients error:', error);
        }
    };

    const handleAddSection = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/add-section', { name: newSection });
            setSuccess('Bo\'lim qo\'shildi!');
            setNewSection('');
            fetchMenu();
        } catch (error) {
            setError(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('sectionName', newItem.sectionName);
            formData.append('name', newItem.name);
            formData.append('price', newItem.price);
            formData.append('description', newItem.description);
            if (newItem.image) {
                formData.append('image', newItem.image);
            }
            formData.append('recipe', JSON.stringify(newItem.recipe));

            await axios.post('/api/add-item', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccess('Mahsulot qo\'shildi!');
            setNewItem({
                sectionName: '',
                name: '',
                price: '',
                description: '',
                image: null,
                recipe: []
            });
            fetchMenu();
        } catch (error) {
            setError(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Mahsulotni o\'chirmoqchimisiz?')) return;

        try {
            await axios.delete(`/api/delete-item/${itemId}`);
            setSuccess('Mahsulot o\'chirildi!');
            fetchMenu();
        } catch (error) {
            setError(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/admin/add-user', newUser);
            setSuccess(`Hodim qo'shildi! Parol: ${response.data.generatedPassword || newUser.password}`);
            setNewUser({ username: '', password: '', role: 'hodim' });
            fetchUsers();
        } catch (error) {
            setError(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Hodimni o\'chirmoqchimisiz?')) return;

        try {
            await axios.delete(`/api/admin/delete-user/${userId}`);
            setSuccess('Hodim o\'chirildi!');
            fetchUsers();
        } catch (error) {
            setError(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    const handleUpdateIngredients = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/admin/update-ingredients', {
                ingredients: ingredientsInput
            });
            setSuccess('Masalliqlar yangilandi!');
            fetchIngredients();
        } catch (error) {
            setError(error.response?.data?.error || 'Xato yuz berdi');
        }
    };

    const addIngredientInput = () => {
        setIngredientsInput([...ingredientsInput, { item_name: '', quantity: 0 }]);
    };

    const updateIngredientInput = (index, field, value) => {
        const updated = [...ingredientsInput];
        updated[index][field] = value;
        setIngredientsInput(updated);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        navigate('/boshliq');
    };

    return (
        <div className="boshliq-dashboard-container">
            <div className="dashboard-header">
                <h1>Boshliq Paneli</h1>
                <button className="btn btn-danger" onClick={logout}>Chiqish</button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="tabs">
                <button
                    className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stats')}
                >
                    Statistika
                </button>
                <button
                    className={`tab-btn ${activeTab === 'ingredients' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ingredients')}
                >
                    Masalliqlar
                </button>
                <button
                    className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
                    onClick={() => setActiveTab('menu')}
                >
                    Menu
                </button>
                <button
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Hodimlar
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'stats' && (
                    <div className="stats-section">
                        <div className="card">
                            <h2>Kassadagi Pul</h2>
                            <p className="cash-amount">{stats.totalCash.toLocaleString()} so'm</p>
                        </div>

                        <div className="card">
                            <h2>Sotilgan Mahsulotlar</h2>
                            {Object.keys(stats.soldItems).length === 0 ? (
                                <p>Hozircha ma'lumot yo'q</p>
                            ) : (
                                <table className="stats-table">
                                    <thead>
                                        <tr>
                                            <th>Mahsulot</th>
                                            <th>Soni</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(stats.soldItems).map(([name, count]) => (
                                            <tr key={name}>
                                                <td>{name}</td>
                                                <td>{count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'ingredients' && (
                    <div className="card">
                        <h2>Masalliqlar Boshqaruvi</h2>
                        <form onSubmit={handleUpdateIngredients}>
                            {ingredientsInput.map((ing, index) => (
                                <div key={index} className="ingredient-row">
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Masalliq nomi"
                                        value={ing.item_name}
                                        onChange={(e) => updateIngredientInput(index, 'item_name', e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        className="input-field"
                                        placeholder="Miqdor"
                                        value={ing.quantity}
                                        onChange={(e) => updateIngredientInput(index, 'quantity', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            ))}
                            <button type="button" className="btn btn-primary" onClick={addIngredientInput}>
                                + Masalliq qo'shish
                            </button>
                            <button type="submit" className="btn btn-success">
                                Saqlash
                            </button>
                        </form>

                        {ingredients.length > 0 && (
                            <div className="ingredients-status">
                                <h3>Hozirgi Holat</h3>
                                <table className="stats-table">
                                    <thead>
                                        <tr>
                                            <th>Masalliq</th>
                                            <th>Boshlang'ich</th>
                                            <th>Qoldiq</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ingredients.map((ing) => (
                                            <tr key={ing._id} className={ing.remaining < 10 ? 'low-stock' : ''}>
                                                <td>{ing.item_name}</td>
                                                <td>{ing.start_quantity}</td>
                                                <td>{ing.remaining}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'menu' && (
                    <div className="menu-section">
                        <div className="card">
                            <h2>Yangi Bo'lim Qo'shish</h2>
                            <form onSubmit={handleAddSection}>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Bo'lim nomi"
                                    value={newSection}
                                    onChange={(e) => setNewSection(e.target.value)}
                                />
                                <button type="submit" className="btn btn-primary">Qo'shish</button>
                            </form>
                        </div>

                        <div className="card">
                            <h2>Yangi Mahsulot Qo'shish</h2>
                            <form onSubmit={handleAddItem}>
                                <select
                                    className="input-field"
                                    value={newItem.sectionName}
                                    onChange={(e) => setNewItem({ ...newItem, sectionName: e.target.value })}
                                    required
                                >
                                    <option value="">Bo'limni tanlang</option>
                                    {menu && menu.sections && menu.sections.map((section, idx) => (
                                        <option key={idx} value={section.name}>{section.name}</option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Mahsulot nomi"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                    required
                                />

                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="Narxi"
                                    value={newItem.price}
                                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                    required
                                />

                                <textarea
                                    className="input-field"
                                    placeholder="Tavsif"
                                    value={newItem.description}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                />

                                <input
                                    type="file"
                                    className="input-field"
                                    accept="image/*"
                                    onChange={(e) => setNewItem({ ...newItem, image: e.target.files[0] })}
                                />

                                <button type="submit" className="btn btn-success">Qo'shish</button>
                            </form>
                        </div>

                        {menu && menu.sections && menu.sections.map((section, idx) => (
                            <div key={idx} className="card">
                                <h2>{section.name}</h2>
                                <div className="menu-items-grid">
                                    {section.items && section.items.map((item) => (
                                        <div key={item._id} className="menu-item-admin">
                                            {item.image_url && (
                                                <img src={item.image_url} alt={item.name} className="admin-item-image" />
                                            )}
                                            <h3>{item.name}</h3>
                                            <p>{item.price.toLocaleString()} so'm</p>
                                            <button
                                                className="btn btn-danger btn-small"
                                                onClick={() => handleDeleteItem(item._id)}
                                            >
                                                O'chirish
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="users-section">
                        <div className="card">
                            <h2>Yangi Hodim Qo'shish</h2>
                            <form onSubmit={handleAddUser}>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Username"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    required
                                />

                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Parol (bo'sh qoldiring - avto generatsiya)"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                />

                                <select
                                    className="input-field"
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                >
                                    <option value="hodim">Hodim</option>
                                    <option value="admin">Admin</option>
                                </select>

                                <button type="submit" className="btn btn-success">Qo'shish</button>
                            </form>
                        </div>

                        <div className="card">
                            <h2>Hodimlar Ro'yxati</h2>
                            <table className="stats-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Rol</th>
                                        <th>Amallar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user._id}>
                                            <td>{user.username}</td>
                                            <td>{user.role}</td>
                                            <td>
                                                <button
                                                    className="btn btn-danger btn-small"
                                                    onClick={() => handleDeleteUser(user._id)}
                                                >
                                                    O'chirish
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BoshliqDashboard;
