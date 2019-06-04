const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const recentproduct = {
  id: String,
  createTime:String,
  cid:String
  
};

const RecentIdModel = mongoose.model("Recentproduct", recentproduct);

module.exports = RecentIdModel;