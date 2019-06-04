const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const value = {
  name: String,
  email: String,
  mobile_no: Number,
  password: String,
  file: String,
  gender: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
 lastLogin: String,
 createTime :String,
 updateTime :String,
 status:String,
 role:String
};

const UserModel = mongoose.model("User", value);

module.exports = UserModel;

