const Stripe = require('stripe');
const { User, Transaction } = require('../models');

// Initialize Stripe directly
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const createDepositIntent = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        // Create a PaymentIntent with the order amount and currency
        // Amount in Stripe is in smallest currency unit (e.g., cents)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'usd',
            metadata: {
                userId: userId.toString(),
                type: 'deposit'
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ message: 'Error creating payment intent', error: error.message });
    }
};

const handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // req.rawBody must be available. 
        // We will ensure in server.js that rawBody is preserved for this route.
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        await handleSuccessfulDeposit(paymentIntent);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
};

const handleSuccessfulDeposit = async (paymentIntent) => {
    const { userId, type } = paymentIntent.metadata;
    const amount = paymentIntent.amount / 100; // Convert back to main currency unit

    if (type === 'deposit' && userId) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                console.error(`User not found for deposit: ${userId}`);
                return;
            }

            const t = await user.sequelize.transaction();

            try {
                // Update user balance
                const newBalance = parseFloat(user.balance) + parseFloat(amount);
                await user.update({ balance: newBalance }, { transaction: t });

                // Create Transaction record
                await Transaction.create({
                    userId,
                    amount,
                    type: 'deposit',
                    status: 'completed',
                    stripePaymentId: paymentIntent.id,
                    description: 'Stripe Deposit'
                }, { transaction: t });

                await t.commit();
                console.log(`Deposit processed for user ${userId}: $${amount}`);
            } catch (err) {
                await t.rollback();
                console.error('Error processing deposit transaction:', err);
            }
        } catch (error) {
            console.error('Error in handleSuccessfulDeposit:', error);
        }
    }
};

module.exports = {
    createDepositIntent,
    handleWebhook
};
