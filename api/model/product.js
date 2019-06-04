const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const product = {
  name: String,
  thumbnail: String,
  otherImg : Array,
  price: Number,
  createTime :String,
  updateTime :String,
  cid:String,
  count:Number,
  status:String,
  category:String,
  des:String,
  quantity:Number
};

const ProductModel = mongoose.model("Product", product);

module.exports = ProductModel;