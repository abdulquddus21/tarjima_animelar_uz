const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Ma'lumotlar bazasini yaratish (in-memory, lekin faylga saqlash uchun ':memory:' ni 'anime.db' bilan almashtirish mumkin)
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) console.error('Ma’lumotlar bazasida xato:', err.message);
    else console.log('Ma’lumotlar bazasi tayyor');
});

// Jadvalarni yaratish va dastlabki ma'lumotlarni qo'shish
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT,
        token TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS anime (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        image TEXT
    )`);

    // Admin foydalanuvchisini qo'shish
    db.run(`INSERT OR IGNORE INTO users (username, password, email, token) VALUES 
        ('admin', 'admin123', 'admin@animetv.uz', 'admin-token-123')`);

    // Dastlabki anime ro'yxati (CORS bilan mos rasmlar)
    const animeData = [
        { title: "Naruto", description: "Yosh ninja sarguzashtlari.", image: "https://i.imgur.com/5k5eB3u.jpg" },
        { title: "Attack on Titan", description: "Titanlarga qarshi kurash.", image: "https://i.imgur.com/8xYkN2v.jpg" },
        { title: "Demon Slayer", description: "Jinlarga qarshi jang.", image: "https://i.imgur.com/4eWvP9Q.jpg" },
        { title: "My Hero Academia", description: "Superqahramonlar dunyosida yosh Izuku Midoriyaning o'sishi.", image: "https://i.imgur.com/6zT9W7L.jpg" },
        { title: "One Piece", description: "Luffy va uning jamoasining xazina izlash sarguzashtlari.", image: "https://i.imgur.com/2eWqL5Y.jpg" },
        { title: "Tokyo Revengers", description: "Vaqt sayohati orqali o'tmishni o'zgartirish hikoyasi.", image: "https://i.imgur.com/9pR4vM3.jpg" },
        { title: "Jujutsu Kaisen", description: "Yuji Itadorining la'natlarga qarshi kurashi.", image: "https://i.imgur.com/7vN5Y8L.jpg" },
        { title: "Death Note", description: "Light Yagami va o'lim daftarining sirli hikoyasi.", image: "https://i.imgur.com/3kY8M5N.jpg" },
        { title: "Haikyuu!!", description: "Volleybol jamoasining g'alaba sari yo'li.", image: "https://i.imgur.com/1fT9N8P.jpg" },
        { title: "Fullmetal Alchemist", description: "Elrik aka-ukalarning alkimyo dunyosidagi sayohati.", image: "https://i.imgur.com/5yT7R9Q.jpg" }
    ];

    animeData.forEach(anime => {
        db.run(`INSERT OR IGNORE INTO anime (title, description, image) VALUES (?, ?, ?)`,
            [anime.title, anime.description, anime.image], (err) => {
                if (err) console.error('Anime qo‘shishda xato:', err);
            });
    });
});

// Token generatsiya qilish
function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

// Ro'yxatdan o'tish API
app.post('/api/register', (req, res) => {
    const { username, password, email } = req.body;
    const token = generateToken();
    db.run(`INSERT INTO users (username, password, email, token) VALUES (?, ?, ?, ?)`,
        [username, password, email, token], (err) => {
            if (err) return res.status(400).json({ message: 'Bu foydalanuvchi nomi band yoki xato!' });
            res.json({ message: 'Ro‘yxatdan o‘tish muvaffaqiyatli', token });
        });
});

// Kirish API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
        if (err || !user) return res.status(401).json({ message: 'Noto‘g‘ri foydalanuvchi nomi yoki parol!' });
        const token = generateToken();
        db.run(`UPDATE users SET token = ? WHERE id = ?`, [token, user.id]);
        res.json({ message: 'Kirish muvaffaqiyatli', token });
    });
});

// Anime ro'yxatini olish
app.get('/api/anime', (req, res) => {
    db.all(`SELECT * FROM anime`, [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Server xatosi!' });
        res.json(rows || []);
    });
});

// Anime qo'shish
app.post('/api/anime', (req, res) => {
    const { title, description, image } = req.body;
    db.run(`INSERT INTO anime (title, description, image) VALUES (?, ?, ?)`,
        [title, description, image], (err) => {
            if (err) return res.status(500).json({ message: 'Anime qo‘shishda xato!' });
            res.json({ message: 'Anime qo‘shildi', id: this.lastID });
        });
});

// Anime o'chirish
app.delete('/api/anime/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM anime WHERE id = ?`, [id], (err) => {
        if (err) return res.status(500).json({ message: 'O‘chirishda xato!' });
        res.json({ message: this.changes ? 'Anime o‘chirildi' : 'Anime topilmadi' });
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server ${PORT} portida ishlamoqda`));