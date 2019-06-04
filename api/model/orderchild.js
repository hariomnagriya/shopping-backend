
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderchild = {
 trans_id:String,
 product_id:String,
 quantity:Number,
 amount:Number,
 createTime:String,
 updateTime:String,
 name:String,
 file:String,
 price:Number,
 status:String,
 cid:String,
};

const OrderchildModel = mongoose.model("Orderchild", orderchild);

module.exports = OrderchildModel;
