const { sequelize, User } = require('./models');

const createAdmin = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });

        const adminUser = await User.create({
            username: 'admin',
            email: 'admin@example.com',
            password: 'adminpassword', // Will be hashed by hook
            role: 'admin',
            status: 'active'
        });

        console.log('Admin user created:', adminUser.username);
        process.exit(0);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            console.log('Admin already exists.');
            // Optional: update to admin if exists
        } else {
            console.error('Error creating admin:', error);
        }
        process.exit(1);
    }
};

createAdmin();
