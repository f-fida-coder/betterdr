const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

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

const http = require('http');
const socketIo = require('./socket');
const startOddsJob = require('./cron/oddsCron');

const server = http.createServer(app);

// Database connection and server start
const startServer = async () => {
    try {
        console.log('\n📦 Starting Sports Betting Backend...\n');

        // Step 1: Authenticate with database
        console.log('🔗 Connecting to database...');
        await sequelize.authenticate();
        console.log(`✅ Database connected successfully.`);
        console.log(`   Database: ${process.env.DB_NAME || 'sports_betting'}`);
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   User: ${process.env.DB_USER || 'postgres'}\n`);

        // Step 2: Sync models (using { alter: true } to update tables without dropping)
        console.log('📋 Syncing database models...');
        const syncResult = await sequelize.sync({ alter: true });
        console.log('✅ Database synced successfully.\n');

        // Step 3: List tables
        try {
            const [tables] = await sequelize.query(`
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' ORDER BY table_name;
            `);
            if (tables.length > 0) {
                console.log(`📊 Tables in database (${tables.length}):`);
                tables.forEach(t => console.log(`   • ${t.table_name}`));
                console.log();
            }
        } catch (err) {
            // Silently fail if query doesn't work
        }

        // Step 4: Initialize Socket.io
        console.log('⚡ Initializing Socket.io...');
        const io = socketIo.init(server);
        console.log('✅ Socket.io initialized.\n');

        // Step 5: Start Background Jobs
        console.log('⏰ Starting background jobs...');
        startOddsJob();
        console.log('✅ Cron jobs started.\n');

        // Step 6: Start server
        server.listen(PORT, () => {
            console.log('╔════════════════════════════════════════════╗');
            console.log('║    ✅ SERVER READY FOR CONNECTIONS!        ║');
            console.log(`║    Port: ${PORT}                                ║`);
            console.log('╚════════════════════════════════════════════╝\n');
        });
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
        console.log('\n📋 Common fixes:');
        console.log('   1. Start PostgreSQL: brew services start postgresql');
        console.log('   2. Check .env file for correct DB settings');
        console.log('   3. Run setup script: npm run setup-db\n');
        process.exit(1);
    }
};

startServer();
