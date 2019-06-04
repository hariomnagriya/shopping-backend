const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const category = {
 category: String,
 cid:String,
 createTime:String,
 updateTime:String,
 status:String,
};

const CategoryModel = mongoose.model("Category", category);

module.exports = CategoryModel;
