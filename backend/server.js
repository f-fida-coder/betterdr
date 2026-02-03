const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

app.get('/', (req, res) => {
    res.send('Sports Betting Backend is running');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/bets', require('./routes/betRoutes'));
app.use('/api/bets', require('./routes/betRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/agent', require('./routes/agentRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/matches', require('./routes/matchRoutes'));
app.use('/api/debug', require('./routes/debugRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

const http = require('http');
const socketIo = require('./socket');
const startOddsJob = require('./cron/oddsCron');

const server = http.createServer(app);

// Database connection and server start
const startServer = async () => {
    try {
        console.log('\n📦 Starting Sports Betting Backend...\n');

        // Step 1: Connect to MongoDB
        console.log('🔗 Connecting to MongoDB...');
        await connectDB();
        console.log('');

        // Step 2: Initialize Socket.io
        console.log('⚡ Initializing Socket.io...');
        const io = socketIo.init(server);
        console.log('✅ Socket.io initialized.\n');

        // Step 3: Start Background Jobs
        console.log('⏰ Starting background jobs...');
        startOddsJob();
        console.log('✅ Cron jobs started.\n');

        // Step 4: Start server
        server.listen(PORT, () => {
            console.log('╔════════════════════════════════════════════╗');
            console.log('║    ✅ SERVER READY FOR CONNECTIONS!        ║');
            console.log(`║    Port: ${PORT}                                ║`);
            console.log('╚════════════════════════════════════════════╝\n');
        });
    } catch (error) {
        console.error('❌ Unable to connect to MongoDB:', error.message);
        console.log('\n📋 Common fixes:');
        console.log('   1. Start MongoDB: mongod (or via MongoDB Compass)');
        console.log('   2. Check .env file for MONGODB_URI');
        console.log('   3. Default URI: mongodb://localhost:27017/sports_betting\n');
        process.exit(1);
    }
};

startServer();
