const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/product", { useNewUrlParser: true });
const User = require("./model/users");
const Product = require("./model/product");
const Category = require("./model/category");
const cors = require("cors");
var bcrypt = require("bcrypt");
const crypto = require("crypto");
app.use(cors());

const { check, body, validationResult } = require("express-validator/check");
const nodemailer = require("nodemailer");

const multer = require("multer");
var jwt = require("jsonwebtoken");
var upload = multer({
  dest: "uploads/"
  //   fileFilter: function(req, file, cb) {
  //     var filetypes = /jpeg|jpg|json/;
  //     var mimetype = filetypes.test(file.mimetype);
  //     //var extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  //     if (mimetype && extname) {
  //       return cb(null, true);
  //     }
  //     cb(
  //       "Error: File upload only supports the following filetypes - " + filetypes
  //     );
  //   }
});

const verifyToken = (req, res, next) => {
  console.log(req.headers["authorization"]);
  if (!req.headers["authorization"]) {
    return res.status(401).json({
      message: "unauthorize access"
    });
  }
  const token = req.headers["authorization"].replace("Bearer ", "");
  jwt.verify(token, "nikita", function(err, decoded) {
    if (err) {
      return res.status(401).json({
        message: "Invalid token"
      });
    }
    req.currentUser = decoded;
    next();
  });
};

app.use(bodyParser.json());
app.use(express.static(__dirname));

app.post(
  "/addUser",
  upload.single("file"),
  [
    check("name")
      .not()
      .isEmpty()
      .withMessage("Name can't be empty"),
    check("email")
      .not()
      .isEmpty()
      .withMessage("Email can't be empty")
      .isEmail()
      .withMessage("Enter the valid email")
      .normalizeEmail()
      .trim()
      .custom(async (email, { req, res }) => {
        const userData = await User.findOne({ email });
        console.log(userData);
        if (userData) {
          throw new Error("Email address already exist.");
        }
      }),
    check("password")
      .not()
      .isEmpty()
      .withMessage("Password cant be empty")
      .isLength({ min: 6 })
      .withMessage("must be at least 6 chars long")
      .isLength({ max: 10 })
      .withMessage("max length of password is 10")
      .custom((value, { req }) => {
        if (value !== req.body.confirmPassword) {
          throw new Error("Password confirmation is incorrect");
        } else {
          return value;
        }
      })
      .withMessage("password didn't match"),
    check("mobile_no")
      .not()
      .isEmpty()
      .withMessage("Mobile no. cant be empty")
      .isInt()
      .withMessage("character not allowed")
      .isLength({ min: 7 })
      .withMessage("Mobile no. at list 7 digit long")
      .isLength({ max: 14 })
      .withMessage("Mobile no. max length is 14"),
    check("gender")
      .not()
      .isEmpty()
      .withMessage("gender is required")
    // check("file")
    //   .not()
    //   .isEmpty()
    //   .withMessage("image is required")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    console.log(req);
    console.log(errors);
    console.log("errors");
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message: errors.array(),
        success: false
      });
    }

    try {
      const { body, file } = req;
      const Password = req.body.password;
      const salt = bcrypt.genSaltSync(5);
      const hash = bcrypt.hashSync(Password, salt);
      req.body.password = hash;
      const user = new User({
        ...body,
        // file: `${file.destination}${file.filename}`,
        password: hash
      });
      const result = await user.save();
      if (!result) {
        res.status(500).json({
          message: "data did't get"
        });
      } else if (result) {
        const object = { ...result._doc };
        var token = jwt.sign(object, "nikita", { expiresIn: "1h" });
        res.status(200).json({
          token,
          files: req.file,
          body: req.body,
          result,
          message: "Data get."
        });
        var transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: "minal.chapter247@gmail.com",
            pass: "minal@247"
          }
        });
        var mailOptions = {
          from: "minal.chapter247@gmail.com",
          to: req.body.email,
          subject: "SignUp ",
          text: "Welcome " + req.body.name + " you are sucessfully Registerd ! "
        };
        transporter.sendMail(mailOptions, function(error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log("Email sent: " + info.response);
            res.status(200).json({
              result,
              message: "Mail sent sucessfully"
            });
          }
        });
      }
    } catch (error) {
      res.status(500).json({
        message:
          errors.message ||
          "An unexpected error occure while processing your request."
      });
    }
  }
);
app.get("/getuser", async (req, res) => {
  // First read existing users.
  try {
    const result1 = await User.find();
    res.status(200).json({
      result1,
      message: "Data get."
    });
  } catch (error) {
    res.status(500).json({
      message:
        error.message ||
        "An unexpected error occure while processing your request."
    });
  }
});
app.post(
  "/login",
  [
    check("email")
      .not()
      .isEmpty()
      .withMessage("Email can't be empty")
      .isEmail()
      .withMessage("Enter the valid email")
      .trim()
      .normalizeEmail(),
    check("password")
      .not()
      .isEmpty()
      .withMessage("Password can't be empty")
  ],
  async (req, res) => {
    try {
      const { body } = req;
      const Email = body.email;
      const Password = body.password;
      const result = await User.findOne({ email: Email });
      console.log(result);
      if (!result) {
        res.status(400).json({
          message: "Email is not registerd.",
          success: false
        });
      }
      const check = bcrypt.compareSync(Password, result.password);
      if (!check) {
        res.status(400).json({
          message: "password didn't match.",
          success: false
        });
      } else {
        const object = { ...result._doc };
        var token = jwt.sign(object, "nikita", { expiresIn: "1h" });
        res.status(200).json({
          token,
          result,
          message: "Logged in successfully!",
          success: true
        });
      }
    } catch (error) {
      console.log(error);

      res.status(500).json({
        message: error.message || "unwanted error occurred."
      });
    }
  }
);
app.delete("/user/:userId", async (req, res) => {
  // First read existing users.
  try {
    const { params } = req;
    const result = await User.findByIdAndDelete(params.userId);
    res.status(200).json({
      result,
      message: "Data get."
    });
  } catch (error) {
    res.status(500).json({
      message:
        error.message ||
        "An unexpected error occure while processing your request."
    });
  }
});
app.post("/category", async (req, res) => {
  try {
    const { body } = req;
    const result = await new Category({ ...body });
    res.status(200).json({
      result,
      message: "category added !"
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "unexpeced error occured."
    });
  }
});
app.delete("/deleteCategory",async(req,res)=>
{
  
})
var server = app.listen(8080, function() {
  var host = server.address().address;
  var port = server.address().port;
  console.log("Example app listening at http://%s:%s", host, port);
});
