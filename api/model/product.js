const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const product = {
  name: String,
  file: String,
  price: Number
};

const ProductModel = mongoose.model("Product", product);

module.exports = ProductModel;