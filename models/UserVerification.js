const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserVerificationSchema = new Schema({
  _id: String,
  uniqueString: String,
  createdAt: Date,
  expireAt: Date,
});

const UserVerification = mongoose.model(
  "UserVerification",
  UserVerificationSchema
);

module.exports = UserVerification;
