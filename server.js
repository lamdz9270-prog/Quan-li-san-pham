const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ============ CẤU HÌNH ADMIN ============
const ADMIN_EMAIL = 'lamdz9270@gmail.com';

// ============ FILE LƯU DỮ LIỆU ============
const DATA_FILE = path.join(__dirname, 'data.json');

// Khởi tạo dữ liệu mặc định
function initData() {
    if (!fs.existsSync(DATA_FILE)) {
        const defaultData = {
            users: [
                {
                    email: 'lamdz9270@gmail.com',
                    password: 'admin123',
                    balance: 999999999,
                    displayName: 'Admin',
                    joined: new Date().toISOString(),
                    role: 'admin'
                }
            ],
            products: [
                { 
                    id: '1', 
                    name: 'Proxy VIP 1', 
                    price: 50000, 
                    desc: 'Proxy chất lượng cao, tốc độ ổn định', 
                    catId: 'Proxy', 
                    image: '', 
                    isManual: 0 
                },
                { 
                    id: '2', 
                    name: 'Proxy VIP 2', 
                    price: 80000, 
                    desc: 'Proxy tốc độ cao, ổn định 24/7', 
                    catId: 'Proxy', 
                    image: '', 
                    isManual: 0 
                }
            ],
            orders: [],
            keys: [],
            topups: []
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    }
}
initData();

function readData() {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Middleware kiểm tra admin
function isAdmin(req, res, next) {
    const email = req.query.email || req.body.email || req.headers.email;
    if (email === ADMIN_EMAIL) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Bạn không có quyền admin!' });
    }
}

// ============ AUTH API ============

// 1. Đăng ký
app.post('/api/auth/register', (req, res) => {
    const { email, pass } = req.body;
    if (!email || !pass) {
        return res.status(400).json({ success: false, message: 'Email và mật khẩu bắt buộc!' });
    }
    
    const data = readData();
    if (data.users.find(u => u.email === email)) {
        return res.status(400).json({ success: false, message: 'Email đã tồn tại!' });
    }
    
    data.users.push({
        email,
        password: pass,
        balance: 0,
        displayName: email.split('@')[0],
        joined: new Date().toISOString(),
        role: 'user'
    });
    writeData(data);
    res.json({ success: true, message: 'Đăng ký thành công!' });
});

// 2. Đăng nhập
app.post('/api/auth/login', (req, res) => {
    const { email, pass } = req.body;
    if (!email || !pass) {
        return res.status(400).json({ success: false, message: 'Email và mật khẩu bắt buộc!' });
    }
    
    const data = readData();
    const user = data.users.find(u => u.email === email && u.password === pass);
    
    if (user) {
        res.json({ 
            success: true, 
            message: 'Đăng nhập thành công!', 
            email: user.email,
            role: user.role || 'user'
        });
    } else {
        res.status(400).json({ success: false, message: 'Sai email hoặc mật khẩu!' });
    }
});

// 3. Lấy thông tin user
app.get('/api/auth/me', (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const data = readData();
    const user = data.users.find(u => u.email === email);
    
    if (user) {
        res.json({ 
            email: user.email, 
            displayName: user.displayName,
            role: user.role || 'user'
        });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// ============ BALANCE API ============

// 4. Lấy số dư
app.get('/api/balance', (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Thiếu email!' });
    }
    
    const data = readData();
    const user = data.users.find(u => u.email === email);
    
    if (user) {
        res.json({ success: true, balance: user.balance });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

// ============ PRODUCT API ============

// 5. Lấy danh sách sản phẩm
app.get('/api/products', (req, res) => {
    const data = readData();
    res.json(data.products);
});

// 6. Thêm sản phẩm (Admin)
app.post('/api/admin/products', isAdmin, (req, res) => {
    const { name, price, desc, catId, image, isManual } = req.body;
    if (!name || !price) {
        return res.status(400).json({ success: false, message: 'Tên và giá bắt buộc!' });
    }
    
    const data = readData();
    const newProduct = {
        id: Date.now().toString(),
        name,
        price: parseInt(price),
        desc: desc || '',
        catId: catId || 'Khác',
        image: image || '',
        isManual: isManual || 0
    };
    data.products.push(newProduct);
    writeData(data);
    res.json({ success: true, product: newProduct });
});

// 7. Xóa sản phẩm (Admin)
app.delete('/api/admin/products/:id', isAdmin, (req, res) => {
    const id = req.params.id;
    const data = readData();
    data.products = data.products.filter(p => p.id !== id);
    writeData(data);
    res.json({ success: true });
});

// ============ KEY MANAGEMENT API ============

// 8. Thêm key (Admin)
app.post('/api/admin/keys', isAdmin, (req, res) => {
    const { productId, keys } = req.body;
    if (!productId || !keys || !Array.isArray(keys) || keys.length === 0) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin!' });
    }
    
    const data = readData();
    const product = data.products.find(p => p.id === productId);
    if (!product) {
        return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại!' });
    }
    
    const newKeys = keys.map(k => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
        productId: productId,
        key: k.trim(),
        status: 'available',
        orderId: null
    }));
    
    data.keys.push(...newKeys);
    writeData(data);
    res.json({ success: true, keys: newKeys, total: newKeys.length });
});

// 9. Lấy danh sách key (Admin)
app.get('/api/admin/keys', isAdmin, (req, res) => {
    const data = readData();
    res.json({ success: true, keys: data.keys });
});

// 10. Lấy key theo sản phẩm (Admin)
app.get('/api/admin/keys/:productId', isAdmin, (req, res) => {
    const productId = req.params.productId;
    const data = readData();
    const keys = data.keys.filter(k => k.productId === productId);
    res.json({ success: true, keys });
});

// 11. Xóa key (Admin)
app.delete('/api/admin/keys/:id', isAdmin, (req, res) => {
    const id = req.params.id;
    const data = readData();
    data.keys = data.keys.filter(k => k.id !== id);
    writeData(data);
    res.json({ success: true });
});

// ============ ORDER API ============

// 12. Tạo đơn hàng
app.post('/api/create-order', (req, res) => {
    const { email, cart, paymentMethod } = req.body;
    if (!email || !cart || cart.length === 0) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin đơn hàng!' });
    }
    
    const data = readData();
    const user = data.users.find(u => u.email === email);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found!' });
    }
    
    let total = 0;
    cart.forEach(item => {
        total += item.price * item.quantity;
    });
    
    if (paymentMethod === 'balance' && user.balance < total) {
        return res.status(400).json({ success: false, message: 'Số dư không đủ!' });
    }
    
    const orderId = 'ORD-' + Date.now();
    const newOrder = {
        id: orderId,
        email: email,
        items: cart,
        total: total,
        status: paymentMethod === 'balance' ? 'PAID' : 'PENDING',
        deliveryData: '',
        createdAt: new Date().toISOString()
    };
    
    if (paymentMethod === 'balance') {
        user.balance -= total;
        newOrder.deliveryData = '✅ Thanh toán thành công! Đang chờ admin gửi key...';
        newOrder.status = 'PAID';
    }
    
    data.orders.push(newOrder);
    writeData(data);
    res.json({ success: true, orderId: orderId });
});

// 13. Kiểm tra đơn hàng
app.get('/api/check-order', (req, res) => {
    const id = req.query.id;
    if (!id) {
        return res.status(400).json({ error: 'Thiếu mã đơn hàng!' });
    }
    
    const data = readData();
    const order = data.orders.find(o => o.id === id);
    
    if (order) {
        res.json({
            id: order.id,
            status: order.status,
            total: order.total,
            deliveryData: order.deliveryData || ''
        });
    } else {
        res.status(404).json({ error: 'Order not found' });
    }
});

// 14. Lịch sử đơn hàng của user
app.post('/api/user-orders', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Thiếu email!' });
    }
    
    const data = readData();
    const orders = data.orders.filter(o => o.email === email);
    res.json(orders);
});

// ============ TOPUP API ============

// 15. Nạp thẻ cào
app.post('/api/topup', (req, res) => {
    const { email, cardNumber, cardSerial, cardType, cardValue } = req.body;
    if (!email || !cardNumber || !cardSerial) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin thẻ!' });
    }
    
    const data = readData();
    const user = data.users.find(u => u.email === email);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found!' });
    }
    
    // Giả lập nạp thẻ (80% giá trị)
    const bonus = cardValue * 0.8;
    user.balance += bonus;
    
    data.topups.push({
        id: Date.now().toString(),
        email: email,
        amount: cardValue,
        received: bonus,
        cardType: cardType,
        status: 'SUCCESS',
        createdAt: new Date().toISOString()
    });
    
    writeData(data);
    res.json({ 
        success: true, 
        message: 'Nạp thẻ thành công!',
        newBalance: user.balance 
    });
});

// ============ ADMIN API ============

// 16. Thống kê tổng quan (Admin)
app.get('/api/admin/stats', isAdmin, (req, res) => {
    const data = readData();
    const totalRevenue = data.orders.reduce((sum, o) => sum + o.total, 0);
    
    res.json({
        totalOrders: data.orders.length,
        totalRevenue: totalRevenue,
        totalUsers: data.users.length,
        totalKeys: data.keys.length,
        availableKeys: data.keys.filter(k => k.status === 'available').length
    });
});

// 17. Lấy tất cả đơn hàng (Admin)
app.get('/api/admin/orders', isAdmin, (req, res) => {
    const data = readData();
    res.json(data.orders);
});

// 18. Cập nhật đơn hàng (Admin)
app.put('/api/admin/orders/:id', isAdmin, (req, res) => {
    const id = req.params.id;
    const { status, deliveryData } = req.body;
    const data = readData();
    const order = data.orders.find(o => o.id === id);
    
    if (order) {
        if (status) order.status = status;
        if (deliveryData) order.deliveryData = deliveryData;
        writeData(data);
        res.json({ success: true, order });
    } else {
        res.status(404).json({ success: false, message: 'Order not found' });
    }
});

// 19. Lấy danh sách user (Admin)
app.get('/api/admin/users', isAdmin, (req, res) => {
    const data = readData();
    res.json(data.users.map(u => ({
        email: u.email,
        displayName: u.displayName,
        balance: u.balance,
        joined: u.joined,
        role: u.role || 'user'
    })));
});

// 20. Cộng tiền cho user (Admin)
app.post('/api/admin/add-balance', isAdmin, (req, res) => {
    const { email, amount } = req.body;
    if (!email || !amount) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin!' });
    }
    
    const data = readData();
    const user = data.users.find(u => u.email === email);
    
    if (user) {
        user.balance += parseInt(amount);
        writeData(data);
        res.json({ success: true, newBalance: user.balance });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
});

// ============ CHẠY SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📁 Dữ liệu lưu tại: ${DATA_FILE}`);
    console.log(`👑 Admin: ${ADMIN_EMAIL}`);
    console.log(`🔑 Mật khẩu admin: admin123`);
});
