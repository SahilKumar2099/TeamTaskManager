const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5000'];

app.use(cors({
    origin: corsOrigins,
    credentials: true
}));
app.use(express.json());

const port = process.env.PORT || 5000;

const authRoutes  = require('./routes/auth');
const teamRoutes  = require('./routes/teams');
const boardRoutes = require('./routes/boards');
const taskRoutes  = require('./routes/tasks');

app.use('/api/auth',   authRoutes);
app.use('/auth',       authRoutes);
app.use('/api/teams',  teamRoutes);
app.use('/teams',      teamRoutes);
app.use('/api/boards', boardRoutes);
app.use('/boards',     boardRoutes);
app.use('/api/tasks',  taskRoutes);
app.use('/tasks',      taskRoutes);

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