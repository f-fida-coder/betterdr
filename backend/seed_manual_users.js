const { User } = require('./models');
const bcrypt = require('bcrypt');
const sequelize = require('./config/database');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');
        await sequelize.sync();

        // Check if admin exists
        const adminExists = await User.findOne({ where: { role: 'admin' } });

        if (adminExists) {
            console.log('Admin already exists:', adminExists.username);
            console.log('Password is likely "admin123" if you haven\'t changed it.');
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);

            const admin = await User.create({
                username: 'admin',
                email: 'admin@example.com',
                password: 'admin123', // Will be hashed by hook if not manually hashed, but manual hash here to be safe if hook logic varies
                role: 'admin',
                status: 'active',
                balance: 1000000
            });
            console.log('Admin created successfully.');
            console.log('Username: admin');
            console.log('Password: admin123');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
