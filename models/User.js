const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    fname: String,
    lname: String,
    email: String,
    gender: String,
    password: String,
    verified: Boolean
});

const User = mongoose.model('User', UserSchema)

module.exports = User;