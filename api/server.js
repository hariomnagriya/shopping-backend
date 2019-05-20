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
var path = require('path')
const { check, validationResult } = require("express-validator/check");
const nodemailer = require("nodemailer");
const multer = require("multer");
var upload = multer({
  dest: './uploads/',

  fileFilter: function (req, file, cb) {
    var filetypes = /jpeg|jpg|png/;
    var mimetype = filetypes.test(file.mimetype);
    var extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb("Error: File upload only supports the following filetypes - " + filetypes);
  }
});
var jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  console.log(req.headers["authorization"]);
  if (!req.headers["authorization"]) {
    return res.status(401).json({
      message: "unauthorize access"
    });
  }
  const token = req.headers["authorization"].replace("Bearer ", "");
  jwt.verify(token, "nikita", function (err, decoded) {
    if (err) {
      return res.status(401).json({
        message: "Invalid token"
      });
    }
    req.currentUser = decoded;
    next();
  });
};
app.use(cors());
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
        if (value !== req.body.cpassword) {
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
      .withMessage("gender is required"),
    check("file")
      .not()
      .isEmpty()
      .withMessage("image is required")
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
      const user = new User({ ...body, file: `${file.destination}${file.filename}`, password: hash });
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
        transporter.sendMail(mailOptions, function (error, info) {
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
        const today = new Date();
        var time = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' / ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        const resulte1 = await User.findOneAndUpdate({email:Email},{$set:{lastLogin:time}});
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

//Add the Product 
app.post('/addProduct',upload.single('file'),[
  //Product-title validation
  check('name')
  .not().isEmpty().withMessage('Product name cant be empty.'),
  // check('productDetail')
  // .not().isEmpty().withMessage('Product Detail cant be empty.'),
  // check('productPrice')
  // .not().isEmpty().withMessage('Product price cant be empty.')
  // .isNumeric().withMessage('Only contain a numeric value.'),
  check('price')
  .not().isEmpty().withMessage('Product  price cant be empty.')
  .isNumeric().withMessage('only contain a numeric value.'),
  // check('file')
  // .not().isEmpty().withMessage('Product image cant be empty')
],async (req, res) => {
  const errors = validationResult(req);
  // If error not occure    
      if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() 
      });
  }
  try {
      const { body,file } = req;
      const product = new Product({...body,file: `${file.destination}${file.filename}`});
      const result = await product.save();
      if(!result){
          res.status(500).json({
              result,
              message: " Product  not add  sucessfull try again later",
              sucess:false
              });
      }else if(result){
          res.status(200).json({
              files: req.file,
              body: req.body,
              result,
              message:"Add-Product Sucessfully",
              sucess:true
          })
      } 
  
  } catch (error) {
      res.status(500).json({
      message:error.message || "An unexpected error occure while processing your request.",
      sucess:false
      });
      }
  });  
 
//Product List
app.post("/showproduct1",async (req, res) => {
// First read existing users.
try {
  const { body } = req;
  const C_id =req.body.Cid;
 // const Skip =req.body.skip;
 // const Limit =req.body.limit;
 //console.log("hello ",Skip);
 //console.log("Limit ",Limit);
const result = await Product.count({_id: C_id},function (err, results) {
});
//console.log(count);
res.status(200).json({
result,
message: "Data get.",
});
} catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
});    

//Product List
app.post("/showproduct",async (req, res) => {
// First read existing users.
try {
  const { body } = req;
  const C_id =req.body.Cid;
  const Skip =req.body.skip;
  const Limit =req.body.limit;
 //console.log("hello ",Skip);
 //console.log("Limit ",Limit);
const result = await Product.find({_id: C_id}).limit(Limit).skip(Skip);
res.status(200).json({
result,
Skip,
message: "Data get.",
});
} catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
});

//Search product
app.post("/searchProduct",async (req, res) => {
  // First read existing users.
  try {
    const { body } = req;
    
    const Name = body.name
   
  const result = await Product.find({name:Name});
  res.status(200).json({
  result,
  message: "Data get.",
  });
  } catch (error) {
  res.status(500).json({
  message:
  error.message ||
  "An unexpected error occure while processing your request.",
  });
  }
  });

//User Profile
app.post("/profile",async (req, res) => {
// First read existing users.
try {
  const { body } = req;
  const C_id =req.body.Cid;
const result = await User.findOne({_id: C_id});
res.status(200).json({
result,
message: "Data get.",
});
} catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
});

// search product by price
app.post("/searchProductByPrice",async (req, res) => {
  // First read existing users.
  try {
    const { body } = req;
    const match = body.sort;
    var myshort;
    //const Name = body.name
    if(match=='desending')
    {
     myshort = {price:-1}
    }
    else{
    myshort = {price:1}
    }
  const result = await Product.find().sort(myshort);
  res.status(200).json({
  result,
  message: "Data get.",
  });
  } catch (error) {
  res.status(500).json({
  message:
  error.message ||
  "An unexpected error occure while processing your request.",
  });
  }
  });

//User Profile
app.post("/profile",async (req, res) => {
// First read existing users.
try {
  const { body } = req;
  const C_id =req.body.Cid;
const result = await User.findOne({_id: C_id});
res.status(200).json({
result,
message: "Data get.",
});
} catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
});

app.post("/profileUpdate",upload.single('file'),async (req, res) => {
  try {
  const { body,file } = req;
  let obj = body;
  if (body.imageUpdated === "true") {
  obj = {
  ...obj,
  file: `${file.destination}${file.filename}`
  };
  }
  const result = await User.findOneAndUpdate({ _id: req.body.Cid},{$set: obj});
  
    res.status(200).json({
      files: req.file,
      body: req.body,
  result,
  message: "data updated"
  })
  } catch (error) {
  res.status(500).json({
  message: error.message
  });
  }
  });

app.get("/getItem/:_id",async (req, res) => {
  try {
  const result = await Product.findById({ _id: req.params._id });
  if(result){
  res.status(200).json({
  result,
  message: "Data found."
  });}
  } catch (error) {
  res.status(500).json({
  message: error.message || "unwanted error occured"
  });
  }
  });
  app.delete("/deleteItem/:_id", async (req, res) => {
  try {
  const { params } = req;
  const result = await Product.findByIdAndDelete({ _id: req.params._id });
  res.status(200).json({
    result,
  message: "item Deleted."
  });
  } catch (error) {
  res.status(500).json({
  message:
  error.message ||
  "An unexpected error occure while processing your request."
  });
  }
  });
  app.post("/editItem/:_id",upload.single('file'),async (req, res) => {
  try {
  const { body,file } = req;
  let obj = body;
  if (body.imageUpdated === "true") {
  obj = {
  ...obj,
  file: `${file.destination}${file.filename}`
  };
  }
  const result = await Product.findByIdAndUpdate({ _id: req.params._id},{$set:obj });
  if(result){
    res.status(200).json({
      files: req.file,
      body: req.body,
  result,
  message: "data updated"
  });}
  } catch (error) {
  res.status(500).json({
  message: error.message
  });
  }
  });  


app.post("/forgotPassword", [
  check("email")
    .not().isEmpty().withMessage("Email can't be empty")
    .isEmail().withMessage('Enter the valid email.')
    .trim()
    .normalizeEmail()
],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        errors: errors.array()
      });
    }
    try {
      const user = await User.findOne({
        email: req.body.email
      });
      if (!user) {
        console.error("email not in database");
        res.status(400).json({
          message: "Email does not exist, Plesae enter right email ",
          success: false
        });
      } else {
        const token = crypto.randomBytes(20).toString("hex");
        const user = await User.findOneAndUpdate(
          { email: req.body.email },
          {
            $set: {
              resetPasswordToken: token,
              resetPasswordExpires: Date.now() + 750000
            }
          }
        );
        if (user) {
          res.status(200).json({
            user,
            message: "data get"
          });

          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "hariom.chapter247@gmail.com",
              pass: "hariom@247"
            }
          });

          const mailOptions = {
            from: "hariom.chapter247@gmail.com",
            to: `${user.email}`,
            subject: "Link To Reset Password",
            text:
              "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
              "Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n" +
              `http://192.168.2.107:3000/reset/${token}\n\n` +
              "If you did not request this, please ignore this email and your password will remain unchanged.\n"
          };

          console.log("sending mail");

          transporter.sendMail(mailOptions, (err, response) => {
            if (err) {
              console.error("there was an error: ", err);
            } else {
              console.log("here is the res: ", response);
              res.status(200).json("recovery email sent");
            }
          });
        } else {
          res.status(501).json({
            message:
              error.message ||
              "An unexpected error occure while processing your request.",
          });
        }
      }
    } catch (error) {
      res.status(500).json({
        message:
          error.message ||
          "An unexpected error occure while processing your request.",
      })
    }
  }
);

// const Op = Sequelize.Op;
app.get("/reset/:token1", async (req, res) => {

  const user = await User.findOne({
    resetPasswordToken: req.params.token1,
    resetPasswordExpires: {
      $gt: Date.now()
    }
  });

  console.log("user");
  console.log(user);
  if (!user) {
    console.error("password reset link is invalid or has expired");
    res.status(403).send("password reset link is invalid or has expired");
  } else {
    res.status(200).send({
      user,
      message: "password reset link a-ok"
    });
  }
});

app.put("/updatePasswordViaEmail", [
  check("email")
    .not().isEmpty().withMessage('Email cant be empty.')
    .isEmail().withMessage('Enter the valid email.'),
  check("password")
    .not().isEmpty().withMessage('Password cant be empty.')
    .isLength({ min: 6 }).withMessage('Must be at least 8 chars long.')
    .isLength({ max: 13 }).withMessage('Max length of password is 13.')
    .custom((value, { req }) => {
      if (value !== req.body.cpassword) {
        throw new Error('Password confirmation is incorrect.');
      }
      return true;
    })
    .withMessage("Password did't match.")], async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          errors: errors.array()
        });
      }
      const user = User.findOne({
        email: req.body.email,
        resetPasswordToken: req.body.resetPasswordToken,
        resetPasswordExpires: {
          $gt: Date.now()
        }
      });
      console.log("req.body.token");
      console.log(req.body.resetPasswordToken);
      if (!user) {
        console.error("password reset link is invalid or has expired");
        res.status(403).send("password reset link is invalid or has expired");
      } else if (user != null) {
        console.log("user exists in db");
        const Password = req.body.password;
        const salt = bcrypt.genSaltSync(5);
        const hash = bcrypt.hashSync(Password, salt);
        req.body.password = hash;
        const user = await User.findOneAndUpdate(
          {
            email: req.body.email,
            resetPasswordToken: req.body.resetPasswordToken,
            resetPasswordExpires: {
              $gt: Date.now()
            }
          },
          {
            $set: {
              resetPasswordToken: null,
              resetPasswordExpires: null,
              password: hash
            }
          }
        );
        // console.log("password");
        // console.log(hashedPassword);

        if (user) {
          console.log("password updated");
          res.status(200).send({ message: "password updated" });
        }
      } else {
        console.error("no user exists in db to update");
        res.status(401).json("no user exists in db to update");
      }
    });



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

app.delete("/deleteCategory", async (req, res) => {

});

var server = app.listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log("Example app listening at http://%s:%s", host, port);
});
