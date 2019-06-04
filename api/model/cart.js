const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cart = {
  address: String,
  city: String,
  cvv: Number,
  state: String,
  zip: String,
  cardnumber: String,
  month: String,
 createTime :String,
 updateTime :String,
 status:String
};

const CartModel = mongoose.model("Cart", cart);

module.exports = CartModel;

