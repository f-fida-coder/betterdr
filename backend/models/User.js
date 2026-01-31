const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
            index: true,
        },
        password: {
            type: String,
            required: true,
        },
        fullName: {
            type: String,
            default: null,
        },
        balance: {
            type: mongoose.Decimal128,
            default: 0.00,
            get: (value) => value ? value.toString() : '0.00',
        },
        pendingBalance: {
            type: mongoose.Decimal128,
            default: 0.00,
            get: (value) => value ? value.toString() : '0.00',
        },
        totalWinnings: {
            type: mongoose.Decimal128,
            default: 0.00,
            get: (value) => value ? value.toString() : '0.00',
        },
        role: {
            type: String,
            enum: ['user', 'agent', 'admin'],
            default: 'user',
            index: true,
        },
        status: {
            type: String,
            enum: ['active', 'suspended'],
            default: 'active',
        },
        agentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual field for id (alias of _id) to maintain compatibility
userSchema.virtual('id').get(function () {
    return this._id.toString();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Hash password before updating if it's modified
userSchema.pre('findByIdAndUpdate', async function (next) {
    if (this.getUpdate().$set && this.getUpdate().$set.password) {
        try {
            const salt = await bcrypt.genSalt(10);
            this.getUpdate().$set.password = await bcrypt.hash(this.getUpdate().$set.password, salt);
        } catch (error) {
            return next(error);
        }
    }
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
