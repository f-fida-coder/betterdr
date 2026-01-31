const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        amount: {
            type: mongoose.Decimal128,
            required: true,
            get: (value) => value ? value.toString() : '0.00',
        },
        type: {
            type: String,
            enum: ['deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_refund'],
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'completed',
            index: true,
        },
        stripePaymentId: {
            type: String,
            default: null,
        },
        description: {
            type: String,
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
transactionSchema.virtual('id').get(function() {
    return this._id.toString();
});

module.exports = mongoose.model('Transaction', transactionSchema);
