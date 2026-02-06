const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const agentSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true, // Unique within Agent collection (and globally enforced by auth logic)
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            default: 'agent',
            immutable: true
        },
        fullName: { type: String, default: null },

        // Agent Financials
        balance: {
            type: mongoose.Decimal128,
            default: 0.00,
            get: (value) => value ? value.toString() : '0.00',
        },
        creditLimit: {
            type: mongoose.Decimal128,
            default: 0.00,
            get: (value) => value ? value.toString() : '0.00',
        },
        balanceOwed: { // Amount they owe the platform
            type: mongoose.Decimal128,
            default: 0.00,
            get: (value) => value ? value.toString() : '0.00',
        },
        agentBillingRate: { // Percentage split?
            type: mongoose.Decimal128,
            default: 0.00,
            get: (value) => value ? value.toString() : '0.00',
        },
        agentBillingStatus: {
            type: String,
            enum: ['paid', 'unpaid'],
            default: 'paid',
        },
        agentBillingLastPaidAt: {
            type: Date,
            default: null,
        },

        status: {
            type: String,
            enum: ['active', 'suspended'],
            default: 'active',
        },

        // Hierarchy
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin', // Agents created by Admins
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

agentSchema.virtual('id').get(function () {
    return this._id.toString();
});

agentSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

agentSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Agent', agentSchema);
