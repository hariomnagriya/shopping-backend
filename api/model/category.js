const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const category = {
  name: String
};

const CategoryModel = mongoose.model("Category", category);

module.exports = CategoryModel;
