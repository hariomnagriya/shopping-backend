const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const newsletter = {
 email: String,
 createTime:String,
 updateTime:String,
 status:String,
};

const NewsLetterModel = mongoose.model("Newsletter", newsletter);

module.exports = NewsLetterModel;