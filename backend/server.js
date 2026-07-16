const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5000'];

app.use(cors({
    origin: corsOrigins,
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth',   require('./routes/auth'));
app.use('/api/teams',  require('./routes/teams'));
app.use('/api/boards', require('./routes/boards'));
app.use('/api/tasks',  require('./routes/tasks'));

app.get('/api', (req, res) => {
    res.json({ message: 'Task Manager API is running' });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    retryWrites: true,
    w: 'majority',
    appName: 'Cluster0'
})
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Server running on http://0.0.0.0:${port}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB error:', err.message);
        process.exit(1);
    });