const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserRecoverySchema = new Schema({
    email: String,
    expireAt: Date,
    code: Number,
});

const UserRecovery = mongoose.model('UserRecovery', UserRecoverySchema)

module.exports = UserRecovery;