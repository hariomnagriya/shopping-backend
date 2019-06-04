const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const order = {
 cid:String,
 trans_id:Array,
 createTime:String,
 updateTime:String,
 status:String,
};

const OrderModel = mongoose.model("Order", order);

module.exports = OrderModel;
