const { User } = require('./models');
const { connectDB } = require('./config/database');
require('dotenv').config();

const createAdmin = async () => {
    try {
        await connectDB();

        const adminData = {
            username: 'fida',
            email: 'fida@example.com',
            password: 'fida123',
            role: 'admin',
            status: 'active'
        };

        let adminUser = await User.findOne({ username: 'fida' });

        if (adminUser) {
            console.log('Admin user fida already exists. Updating password...');
            adminUser.password = 'fida123';
            await adminUser.save();
            console.log('Admin password updated.');
        } else {
            adminUser = new User(adminData);
            await adminUser.save();
            console.log('Admin user created:', adminUser.username);
        }
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
