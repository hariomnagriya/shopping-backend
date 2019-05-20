const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const value = {
  name: String,
  email: String,
  mobile_no: Number,
  password: String,
  file: String,
  gender: String,
  //   DOB: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // lastLogin:new Date()
};

const UserModel = mongoose.model("User", value);

module.exports = UserModel;

