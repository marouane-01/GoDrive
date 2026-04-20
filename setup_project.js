const fs = require('fs');
const path = require('path');

const dirs = [
    'config',
    'models',
    'controllers',
    'routes',
    'middlewares',
    'utils',
    'public',
    'public/css',
    'public/js',
    'public/assets'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const files = {
    '.env': `PORT=3000
DB_USER=postgres
DB_HOST=localhost
DB_NAME=godrive
DB_PASSWORD=1999
DB_PORT=5432
JWT_SECRET=super_secret_key`,

    'database.sql': `
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('client', 'driver')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES users(id),
    driver_id INT REFERENCES users(id),
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    transport_type VARCHAR(50) CHECK (transport_type IN ('local', 'inter-city', 'international')) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_transit', 'delivered')),
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tracking (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    status VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`,

    'server.js': `
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tracking', trackingRoutes);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
});
`,

    'config/db.js': `
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
`,

    'middlewares/auth.js': `
const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Not authorized, token failed' });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'User role not authorized' });
        }
        next();
    };
};
`,

    'middlewares/errorHandler.js': `
exports.errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Server Error'
    });
};
`,

    'utils/qrcode.js': `
const QRCode = require('qrcode');

exports.generateQRCode = async (text) => {
    try {
        return await QRCode.toDataURL(text);
    } catch (err) {
        console.error(err);
        return null;
    }
};
`,

    'controllers/authController.js': `
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('client', 'driver').required()
});

exports.register = async (req, res, next) => {
    try {
        const { error } = registerSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { name, email, password, role } = req.body;

        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, hashedPassword, role]
        );

        res.status(201).json({ success: true, data: newUser.rows[0] });
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please provide email and password' });
        }

        const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.rows[0].password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({ success: true, token, user: { id: user.rows[0].id, name: user.rows[0].name, role: user.rows[0].role } });
    } catch (err) {
        next(err);
    }
};
`,

    'routes/authRoutes.js': `
const express = require('express');
const { register, login } = require('../controllers/authController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);

module.exports = router;
`,

    'controllers/orderController.js': `
const db = require('../config/db');
const { generateQRCode } = require('../utils/qrcode');
const Joi = require('joi');

const orderSchema = Joi.object({
    pickup_location: Joi.string().required(),
    dropoff_location: Joi.string().required(),
    transport_type: Joi.string().valid('local', 'inter-city', 'international').required()
});

exports.createOrder = async (req, res, next) => {
    try {
        const { error } = orderSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { pickup_location, dropoff_location, transport_type } = req.body;
        const client_id = req.user.id;

        const newOrder = await db.query(
            'INSERT INTO orders (client_id, pickup_location, dropoff_location, transport_type) VALUES ($1, $2, $3, $4) RETURNING id',
            [client_id, pickup_location, dropoff_location, transport_type]
        );

        const orderId = newOrder.rows[0].id;
        const trackingUrl = \`http://localhost:\${process.env.PORT || 3000}/tracking.html?id=\${orderId}\`;
        const qrCode = await generateQRCode(trackingUrl);

        await db.query('UPDATE orders SET qr_code = $1 WHERE id = $2', [qrCode, orderId]);
        
        // Add initial tracking
        await db.query('INSERT INTO tracking (order_id, status, location) VALUES ($1, $2, $3)', [orderId, 'pending', pickup_location]);

        res.status(201).json({ success: true, data: { id: orderId, qrCode, trackingUrl } });
    } catch (err) {
        next(err);
    }
};

exports.getOrders = async (req, res, next) => {
    try {
        let query;
        let params = [req.user.id];
        
        if (req.user.role === 'client') {
            query = 'SELECT * FROM orders WHERE client_id = $1 ORDER BY created_at DESC';
        } else {
            // Driver can see their orders or pending orders
            query = 'SELECT * FROM orders WHERE driver_id = $1 OR status = \\'pending\\' ORDER BY created_at DESC';
        }

        const orders = await db.query(query, params);
        res.status(200).json({ success: true, data: orders.rows });
    } catch (err) {
        next(err);
    }
};

exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, location } = req.body;
        const driver_id = req.user.id;

        const validStatuses = ['accepted', 'in_transit', 'delivered'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Update order
        const updatedOrder = await db.query(
            'UPDATE orders SET status = $1, driver_id = $2 WHERE id = $3 RETURNING *',
            [status, driver_id, id]
        );

        if (updatedOrder.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Add tracking entry
        await db.query('INSERT INTO tracking (order_id, status, location) VALUES ($1, $2, $3)', [id, status, location || 'Driver location']);

        res.status(200).json({ success: true, data: updatedOrder.rows[0] });
    } catch (err) {
        next(err);
    }
};
`,

    'routes/orderRoutes.js': `
const express = require('express');
const { createOrder, getOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/auth');
const router = express.Router();

router.use(protect);

router.post('/', authorize('client'), createOrder);
router.get('/', getOrders);
router.put('/:id/status', authorize('driver'), updateOrderStatus);

module.exports = router;
`,

    'controllers/trackingController.js': `
const db = require('../config/db');

exports.getTracking = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const order = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (order.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const history = await db.query('SELECT * FROM tracking WHERE order_id = $1 ORDER BY updated_at DESC', [id]);

        res.status(200).json({ 
            success: true, 
            data: {
                order: order.rows[0],
                history: history.rows
            }
        });
    } catch (err) {
        next(err);
    }
};
`,

    'routes/trackingRoutes.js': `
const express = require('express');
const { getTracking } = require('../controllers/trackingController');
const router = express.Router();

router.get('/:id', getTracking);

module.exports = router;
`,

    'public/css/style.css': `
:root {
    --primary-color: #2ecc71;
    --secondary-color: #27ae60;
    --bg-color: #f4f7f6;
    --text-color: #333;
    --white: #fff;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
    line-height: 1.6;
}

header {
    background: var(--white);
    padding: 1rem 5%;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.logo {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary-color);
    text-decoration: none;
}

nav a {
    color: var(--text-color);
    text-decoration: none;
    margin-left: 1rem;
    font-weight: 500;
}

nav a:hover {
    color: var(--primary-color);
}

.btn {
    display: inline-block;
    background: var(--primary-color);
    color: var(--white);
    padding: 0.5rem 1rem;
    text-decoration: none;
    border-radius: 5px;
    border: none;
    cursor: pointer;
    font-size: 1rem;
}

.btn:hover {
    background: var(--secondary-color);
}

.container {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 20px;
}

.card {
    background: var(--white);
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
}

.form-group input, .form-group select {
    width: 100%;
    padding: 0.8rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.order-card {
    border: 1px solid #eee;
    padding: 1rem;
    border-radius: 5px;
}

.badge {
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.8rem;
    background: #eee;
}
.badge.pending { background: #f39c12; color: white; }
.badge.accepted { background: #3498db; color: white; }
.badge.in_transit { background: #9b59b6; color: white; }
.badge.delivered { background: #2ecc71; color: white; }

#reader {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
}
`,

    'public/js/main.js': `
const API_URL = '/api';

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token && !window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
        window.location.href = '/index.html';
    }
    
    return { token, user };
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

function setupNav() {
    const { user } = checkAuth();
    const nav = document.getElementById('nav-links');
    if (!nav) return;

    if (user) {
        nav.innerHTML = \`
            <a href="/dashboard.html">Dashboard</a>
            <a href="/tracking.html">Tracking</a>
            <a href="#" onclick="logout()">Logout (\${user.name})</a>
        \`;
    } else {
        nav.innerHTML = \`
            <a href="/index.html">Login/Register</a>
            <a href="/tracking.html">Tracking</a>
            <a href="/guide.html">Guide</a>
        \`;
    }
}

document.addEventListener('DOMContentLoaded', setupNav);
`,

    'public/index.html': `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Go Drive - Accueil</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <a href="/" class="logo">Go Drive</a>
        <nav id="nav-links"></nav>
    </header>

    <div class="container grid">
        <div class="card">
            <h2>Connexion</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="loginEmail" required>
                </div>
                <div class="form-group">
                    <label>Mot de passe</label>
                    <input type="password" id="loginPassword" required>
                </div>
                <button type="submit" class="btn">Se connecter</button>
            </form>
        </div>

        <div class="card">
            <h2>Inscription</h2>
            <form id="registerForm">
                <div class="form-group">
                    <label>Nom</label>
                    <input type="text" id="regName" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="regEmail" required>
                </div>
                <div class="form-group">
                    <label>Mot de passe</label>
                    <input type="password" id="regPassword" required>
                </div>
                <div class="form-group">
                    <label>Rôle</label>
                    <select id="regRole">
                        <option value="client">Client</option>
                        <option value="driver">Livreur</option>
                    </select>
                </div>
                <button type="submit" class="btn">S'inscrire</button>
            </form>
        </div>
    </div>

    <script src="js/main.js"></script>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    window.location.href = '/dashboard.html';
                } else {
                    alert(data.error);
                }
            } catch (err) { alert('Error logging in'); }
        });

        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const role = document.getElementById('regRole').value;

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                });
                const data = await res.json();
                if (data.success) {
                    alert('Inscription réussie ! Veuillez vous connecter.');
                } else {
                    alert(data.error);
                }
            } catch (err) { alert('Error registering'); }
        });
    </script>
</body>
</html>
`,

    'public/dashboard.html': `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Go Drive - Dashboard</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <a href="/" class="logo">Go Drive</a>
        <nav id="nav-links"></nav>
    </header>

    <div class="container">
        <div class="card" id="clientControls" style="display:none;">
            <h2>Nouvelle Commande</h2>
            <form id="orderForm">
                <div class="grid">
                    <div class="form-group">
                        <label>Lieu de départ</label>
                        <input type="text" id="pickup" required>
                    </div>
                    <div class="form-group">
                        <label>Lieu d'arrivée</label>
                        <input type="text" id="dropoff" required>
                    </div>
                    <div class="form-group">
                        <label>Type de transport</label>
                        <select id="type">
                            <option value="local">Local</option>
                            <option value="inter-city">Inter-ville</option>
                            <option value="international">International</option>
                        </select>
                    </div>
                </div>
                <button type="submit" class="btn">Créer la commande</button>
            </form>
        </div>

        <div class="card">
            <h2>Mes Commandes</h2>
            <div id="ordersList" class="grid"></div>
        </div>
    </div>

    <script src="js/main.js"></script>
    <script>
        const { token, user } = checkAuth();

        if (user.role === 'client') {
            document.getElementById('clientControls').style.display = 'block';
        }

        async function loadOrders() {
            const res = await fetch('/api/orders', {
                headers: { 'Authorization': \`Bearer \${token}\` }
            });
            const data = await res.json();
            
            const list = document.getElementById('ordersList');
            list.innerHTML = '';
            
            if(data.data) {
                data.data.forEach(order => {
                    let actions = '';
                    if (user.role === 'driver' && order.status !== 'delivered') {
                        actions = \`
                            <select onchange="updateStatus(\${order.id}, this.value)">
                                <option value="">Changer statut...</option>
                                <option value="accepted">Accepter</option>
                                <option value="in_transit">En transit</option>
                                <option value="delivered">Livré</option>
                            </select>
                        \`;
                    }

                    list.innerHTML += \`
                        <div class="order-card">
                            <h3>Commande #\${order.id}</h3>
                            <p><strong>De:</strong> \${order.pickup_location}</p>
                            <p><strong>À:</strong> \${order.dropoff_location}</p>
                            <p><strong>Type:</strong> \${order.transport_type}</p>
                            <p><strong>Statut:</strong> <span class="badge \${order.status}">\${order.status}</span></p>
                            \${order.qr_code && user.role === 'client' ? \`<img src="\${order.qr_code}" alt="QR" width="100">\` : ''}
                            <br>
                            <a href="/tracking.html?id=\${order.id}" class="btn" style="margin-top:10px; font-size:0.8rem;">Voir le suivi</a>
                            \${actions}
                        </div>
                    \`;
                });
            }
        }

        document.getElementById('orderForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pickup = document.getElementById('pickup').value;
            const dropoff = document.getElementById('dropoff').value;
            const type = document.getElementById('type').value;

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({ pickup_location: pickup, dropoff_location: dropoff, transport_type: type })
            });
            
            if (res.ok) {
                alert('Commande créée !');
                loadOrders();
            }
        });

        async function updateStatus(id, status) {
            if(!status) return;
            const location = prompt('Entrez votre position actuelle pour le tracking :');
            await fetch(\`/api/orders/\${id}/status\`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({ status, location })
            });
            loadOrders();
        }

        loadOrders();
    </script>
</body>
</html>
`,

    'public/tracking.html': `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Go Drive - Tracking</title>
    <link rel="stylesheet" href="css/style.css">
    <script src="https://unpkg.com/html5-qrcode"></script>
</head>
<body>
    <header>
        <a href="/" class="logo">Go Drive</a>
        <nav id="nav-links"></nav>
    </header>

    <div class="container">
        <div class="card">
            <h2>Suivre un colis</h2>
            <div class="form-group">
                <input type="text" id="orderId" placeholder="Entrez l'ID de la commande">
                <button class="btn" onclick="trackOrder()">Rechercher</button>
            </div>
            
            <hr style="margin: 20px 0;">
            
            <h3>Ou scannez le QR Code</h3>
            <div id="reader"></div>
        </div>

        <div class="card" id="trackingResult" style="display:none;">
            <h2>Résultat du suivi</h2>
            <div id="orderDetails"></div>
            <h3>Historique</h3>
            <ul id="historyList" style="list-style:none; padding-left:0;"></ul>
        </div>
    </div>

    <script src="js/main.js"></script>
    <script>
        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get('id');
        if(idParam) {
            document.getElementById('orderId').value = idParam;
            trackOrder();
        }

        async function trackOrder() {
            const id = document.getElementById('orderId').value;
            if(!id) return;

            try {
                const res = await fetch(\`/api/tracking/\${id}\`);
                const data = await res.json();

                if(data.success) {
                    document.getElementById('trackingResult').style.display = 'block';
                    document.getElementById('orderDetails').innerHTML = \`
                        <p><strong>Commande #\${data.data.order.id}</strong></p>
                        <p>Statut actuel: <span class="badge \${data.data.order.status}">\${data.data.order.status}</span></p>
                    \`;

                    const history = document.getElementById('historyList');
                    history.innerHTML = '';
                    data.data.history.forEach(h => {
                        history.innerHTML += \`
                            <li style="padding: 10px; border-left: 3px solid var(--primary-color); margin-bottom: 10px; background: #f9f9f9;">
                                <strong>\${new Date(h.updated_at).toLocaleString()}</strong> - 
                                <span class="badge \${h.status}">\${h.status}</span>
                                <p>\${h.location}</p>
                            </li>
                        \`;
                    });
                } else {
                    alert('Commande introuvable');
                }
            } catch(e) {
                alert('Erreur lors du suivi');
            }
        }

        // Scanner QR
        const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
        html5QrcodeScanner.render((decodedText, decodedResult) => {
            // Si le QR contient une URL, on extrait l'ID
            try {
                const url = new URL(decodedText);
                const id = url.searchParams.get('id');
                if(id) {
                    document.getElementById('orderId').value = id;
                    trackOrder();
                    html5QrcodeScanner.clear();
                }
            } catch(e) {
                // Si c'est juste un ID texte
                document.getElementById('orderId').value = decodedText;
                trackOrder();
                html5QrcodeScanner.clear();
            }
        }, (error) => {
            // ignore
        });
    </script>
</body>
</html>
`,

    'public/about.html': `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Go Drive - À propos</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <a href="/" class="logo">Go Drive</a>
        <nav id="nav-links"></nav>
    </header>
    <div class="container card">
        <h2>À propos de Go Drive</h2>
        <p>Go Drive est la plateforme révolutionnaire pour le transport de colis et de bagages. Que ce soit en local, inter-ville ou à l'international, nous connectons les clients avec des livreurs fiables.</p>
    </div>
    <script src="js/main.js"></script>
</body>
</html>
`,

    'public/contact.html': `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Go Drive - Contact</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <a href="/" class="logo">Go Drive</a>
        <nav id="nav-links"></nav>
    </header>
    <div class="container card">
        <h2>Contactez-nous</h2>
        <p>Email: support@godrive.com</p>
        <p>Téléphone: +33 1 23 45 67 89</p>
    </div>
    <script src="js/main.js"></script>
</body>
</html>
`,

    'public/guide.html': `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Go Drive - Guide</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <a href="/" class="logo">Go Drive</a>
        <nav id="nav-links"></nav>
    </header>
    <div class="container card">
        <h2>Comment utiliser Go Drive ?</h2>
        <h3>Pour les clients :</h3>
        <ul>
            <li>Inscrivez-vous en tant que Client.</li>
            <li>Créez une commande depuis votre Dashboard.</li>
            <li>Suivez l'avancement via le Tracking ou en scannant le QR code.</li>
        </ul>
        <h3>Pour les livreurs :</h3>
        <ul>
            <li>Inscrivez-vous en tant que Livreur.</li>
            <li>Acceptez les commandes disponibles sur votre Dashboard.</li>
            <li>Mettez à jour le statut (En transit, Livré) avec votre position.</li>
        </ul>
    </div>
    <script src="js/main.js"></script>
</body>
</html>
`
};

for (const [filepath, content] of Object.entries(files)) {
    fs.writeFileSync(filepath, content.trim() + '\\n');
}
console.log('Project generated successfully.');
