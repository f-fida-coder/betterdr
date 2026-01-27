const { sequelize, User } = require('./models');

const seedRoles = async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true });
        console.log('✅ Connected to database');

        // 1. Ensure Admin
        let admin = await User.findOne({ where: { email: 'admin@example.com' } });
        if (!admin) {
            admin = await User.create({
                username: 'admin',
                email: 'admin@example.com',
                password: 'password123',
                role: 'admin',
                status: 'active',
                fullName: 'Super Admin'
            });
            console.log('✅ Created Admin: admin@example.com / password123');
        } else {
            console.log('ℹ️ Admin already exists: admin@example.com');
        }

        // 2. Ensure Agent
        let agent = await User.findOne({ where: { email: 'agent@example.com' } });
        if (!agent) {
            agent = await User.create({
                username: 'agent',
                email: 'agent@example.com',
                password: 'password123',
                role: 'agent',
                status: 'active',
                fullName: 'Test Agent'
            });
            console.log('✅ Created Agent: agent@example.com / password123');
        } else {
            console.log('ℹ️ Agent already exists: agent@example.com');
        }

        // 3. Ensure User (Assigned to Agent)
        let user = await User.findOne({ where: { email: 'user@example.com' } });
        if (!user) {
            user = await User.create({
                username: 'user',
                email: 'user@example.com',
                password: 'password123',
                role: 'user',
                status: 'active',
                fullName: 'Test User',
                agentId: agent.id
            });
            console.log('✅ Created User: user@example.com / password123 (Assigned to Agent)');
        } else {
            // Ensure assignment
            if (user.agentId !== agent.id) {
                user.agentId = agent.id;
                await user.save();
                console.log('✅ Updated User: Assigned to Agent');
            }
            console.log('ℹ️ User already exists: user@example.com');
        }

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await sequelize.close();
    }
};

seedRoles();
