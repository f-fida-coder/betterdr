const mongoose = require('mongoose');

const betSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        matchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Match',
            required: true,
            index: true,
        },
        amount: {
            type: mongoose.Decimal128,
            required: true,
            validate: {
                validator: function (v) {
                    return v > 0.01;
                },
                message: 'Bet amount must be greater than 0.01',
            },
            get: (value) => value ? value.toString() : '0.00',
        },
        odds: {
            type: mongoose.Decimal128,
            required: true,
            get: (value) => value ? value.toString() : '0.00',
        },
        type: {
            type: String,
            required: true,
        },
        selection: {
            type: String,
            required: true,
        },
        potentialPayout: {
            type: mongoose.Decimal128,
            required: true,
            get: (value) => value ? value.toString() : '0.00',
        },

        status: {
            type: String,
            enum: ['pending', 'won', 'lost', 'void', 'cashed_out'],
            default: 'pending',
            index: true,
        },
        result: {
            type: String,
            default: null, // 'won', 'lost', 'void'
        },
        settledAt: {
            type: Date,
            default: null,
        },
        settledBy: {
            type: String, // 'system', 'admin'
            default: null,
        },
        matchSnapshot: {
            type: mongoose.Schema.Types.Mixed, // Stores snapshot of match data at bet time
            default: {},
        },
        ipAddress: {
            type: String,
            default: null,
        },
        userAgent: {
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
betSchema.virtual('id').get(function () {
    return this._id.toString();
});

module.exports = mongoose.model('Bet', betSchema);
