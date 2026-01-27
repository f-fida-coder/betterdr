const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let adminToken = '';
let agentToken = '';

const timestamp = Date.now();
const agentUsername = `agent_${timestamp}`;
const agentEmail = `agent_${timestamp}@test.com`;
const userUsername = `user_${timestamp}`;
const userEmail = `user_${timestamp}@test.com`;
const agentUserUsername = `agent_user_${timestamp}`;
const agentUserEmail = `agent_user_${timestamp}@test.com`;

async function test() {
    try {
        console.log('=== Testing Agent & User Creation ===\n');

        // 1. Login as admin
        console.log('1. Logging in as admin...');
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        adminToken = adminLogin.data.token;
        console.log('✓ Admin logged in, token:', adminToken.substring(0, 20) + '...\n');

        // 2. Create an agent
        console.log('2. Creating new agent...');
        try {
            const agentRes = await axios.post(`${API_URL}/admin/create-agent`, {
                username: agentUsername,
                email: agentEmail,
                password: 'agent123',
                fullName: 'Agent One'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log('✓ Agent created:', agentRes.data.agent);
        } catch (e) {
            if (e.response && e.response.status === 409) {
                console.log('✓ Agent already exists (skipping)');
            } else {
                throw e;
            }
        }
        console.log();

        // 3. Login as agent
        console.log('3. Logging in as agent...');
        const agentLogin = await axios.post(`${API_URL}/auth/login`, {
            username: agentUsername,
            password: 'agent123'
        });
        agentToken = agentLogin.data.token;
        console.log('✓ Agent logged in, token:', agentToken.substring(0, 20) + '...\n');

        // 4. Admin creates a user
        console.log('4. Admin creating a new user...');
        try {
            const userRes = await axios.post(`${API_URL}/admin/create-user`, {
                username: userUsername,
                email: userEmail,
                password: 'user123',
                fullName: 'Test User One'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log('✓ User created:', userRes.data.user);
        } catch (e) {
            if (e.response && e.response.status === 409) {
                console.log('✓ User already exists (skipping)');
            } else {
                throw e;
            }
        }
        console.log();

        // 5. Agent creates a user (Testing the fix)
        console.log('5. Agent creating a new user...');
        try {
            const agentUserRes = await axios.post(`${API_URL}/agent/create-user`, {
                username: agentUserUsername,
                email: agentUserEmail,
                password: 'user123',
                fullName: 'Agent User One'
            }, {
                headers: { Authorization: `Bearer ${agentToken}` }
            });
            console.log('✓ Agent User created:', agentUserRes.data.user);
        } catch (e) {
            if (e.response && e.response.status === 409) {
                console.log('✓ Agent User already exists (skipping)');
            } else {
                throw e;
            }
        }
        console.log();

        // 6. Get all users
        // 6. Get all users
        console.log('6. Fetching all users...');
        const usersRes = await axios.get(`${API_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✓ Users:', usersRes.data.map(u => ({ id: u.id, username: u.username, role: u.role, agentId: u.agentId })));
        console.log();

        console.log('✅ All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Message:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

test();
