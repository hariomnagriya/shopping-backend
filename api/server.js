const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/product", { useNewUrlParser: true });
const User = require("./model/users");
const Product = require("./model/product");
const Category = require("./model/category");
const NewsLetter = require("./model/newsletter");
const Cart = require("./model/cart");
const Order = require("./model/order");
const Orderchild = require("./model/orderchild");
const RecentProduct = require("./model/recentproduct")
const cors = require("cors");
var bcrypt = require("bcrypt");
const crypto = require("crypto");
const stripe = require("stripe")("sk_test_zCSjOxiIHTNmPJUBdg4hFQAZ");
var path = require('path')
const { check, validationResult } = require("express-validator/check");
const moment = require("moment");
const nodemailer = require("nodemailer");
const multer = require("multer");
var handlebars = require('handlebars');
var fs = require('fs');
var readHTMLFile = function(path, callback) {
    fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
        if (err) {
            throw err;
            callback(err);
        }
        else {
            callback(null, html);
        }
    });
};

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

//***************************************** USER INFORMATIOM   ************************************************// 

app.post("/addUser", upload.single("file"),[
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
      .withMessage("gender is required")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message: errors.array(),
        success: false
      });
    }
    try {
      const { body, file } = req;
      //const today = new Date();
      //var time = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' / ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
      var time = moment().format('MMMM Do YYYY , h:mm:ss a');
      req.body.createTime=time;
      req.body.updateTime=time;
      req.body.role="user";
      req.body.status="Active";
      const Password = req.body.password;
      const salt = bcrypt.genSaltSync(5);
      const hash = bcrypt.hashSync(Password, salt);
      req.body.password = hash;
      const user = new User({ ...body, file: `${file.destination}${file.filename}`, password: hash });
      const result = await user.save();
      if (!result) {
        res.status(500).json({
          message: "Your Registration was faild."
        });
      } else if (result) {
        var transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: "amits.chapter247@gmail.com",
            pass: "amit@247"
          }
        });
        var mailOptions = {
          from: "amits.chapter247@gmail.com",
          to: req.body.email,
          subject: "SignUp ",
          text: "Welcome " + req.body.name + " you are sucessfully Registerd ! "
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            
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
// Get all user with pagination for admin panel
app.post("/getuser", async (req, res) => {
  try {
    const { body } = req;
  const Skip =req.body.skip;
  const Limit =req.body.limit;
    const result1 = await User.find().limit(Limit).skip(Skip);
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

//Get user by sorting for admin panel 
app.post("/getUserByName", async (req, res) => {
  try {
    const {body}=req;
    const match = body.order;
    var myshort;
    var result1;
    const Skip =req.body.skip;
  const Limit =req.body.limit;
    //const Name = body.name
    if(req.body.order && !req.body.name && !req.body.status && !req.body.gender){
    if(match=='desending')
    {
     myshort = {name:-1}
    }
    else if(match=="assending"){
    myshort = {name:1}
    }
    else{
      myshort = {name:0}
    }
    result1 = await User.find({role:"user"}).sort(myshort).limit(Limit).skip(Skip);
    
    }
    else if(req.body.gender && !req.body.order && !req.body.name && !req.body.status){
    
    result1 = await User.find({gender:req.body.gender,role:"user"}).limit(Limit).skip(Skip);
    
    }
    else if(req.body.name && !req.body.order && !req.body.status && !req.body.gender)
    {
      result1 = await User.find({name:{$regex:req.body.name ,$options:'i'},role:"user"}).limit(Limit).skip(Skip);
    }
    else if(req.body.status && !req.body.name && !req.body.order && !req.body.gender){
      result1 = await User.find({status:req.body.status,role:"user"}).limit(Limit).skip(Skip);
    }
    else if (req.body.name && req.body.order && req.body.status && req.body.gender) {
      result1 = await User.find({status:req.body.status,role:"user",name:{$regex:req.body.name ,$options:'i'} ,gender:req.body.gender}).sort(match=='assending'?{name:1}:{name:-1}).limit(Limit).skip(Skip);
    }
    else if (!req.body.name && !req.body.order && !req.body.status && !req.body.gender){
      result1 = await User.find({role:"user"}).sort({createTime:-1}).limit(Limit).skip(Skip);
    }

    else if (req.body.name && req.body.order && !req.body.status && !req.body.gender) {
      result1 = await User.find({name:{$regex:req.body.name ,$options:'i'},role:"user"}).sort(match=='assending'?{name:1}:{name:-1}).limit(Limit).skip(Skip);
    }
     else if (req.body.name && !req.body.order && req.body.status && !req.body.gender) {
      result1 = await User.find({status:req.body.status,role:"user",name:{$regex:req.body.name ,$options:'i'}}).limit(Limit).skip(Skip);
    }
     else if (req.body.name && !req.body.order && !req.body.status && req.body.gender) {
      result1 = await User.find({name:{$regex:req.body.name ,$options:'i'} ,gender:req.body.gender,role:"user"}).limit(Limit).skip(Skip);
    }
     else if (!req.body.name && req.body.order && req.body.status && !req.body.gender) {
      result1 = await User.find({status:req.body.status,role:"user"}).sort(match=='assending'?{name:1}:{name:-1}).limit(Limit).skip(Skip);
    }
     else if (!req.body.name && req.body.order && !req.body.status && req.body.gender) {
      result1 = await User.find({gender:req.body.gender,role:"user"}).sort(match=='assending'?{name:1}:{name:-1}).limit(Limit).skip(Skip);
    }
     else if (!req.body.name && !req.body.order && req.body.status && req.body.gender) {
      result1 = await User.find({status:req.body.status,gender:req.body.gender ,role:"user"}).limit(Limit).skip(Skip);
    }
     else if (req.body.name && req.body.order && req.body.status && !req.body.gender) {
      result1 = await User.find({status:req.body.status,role:"user",name:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{name:1}:{name:-1}).limit(Limit).skip(Skip);
    }
    else if (req.body.name && !req.body.order && req.body.status && req.body.gender) {
      result1 = await User.find({status:req.body.status,role:"user",name:{$regex:req.body.name ,$options:'i'} ,gender:req.body.gender}).limit(Limit).skip(Skip);
    }
     else if (!req.body.name && req.body.order && req.body.status && req.body.gender) {
      result1 = await User.find({status:req.body.status,role:"user",gender:req.body.gender}).sort(match=='assending'?{name:1}:{name:-1}).limit(Limit).skip(Skip);
    }

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

//get user by name order
// app.post("/getUserByOrder",async (req, res) => {
//   // First read existing users.
//   try {
//     const { body } = req;
//     const match = body.order;
//     var myshort;
//     //const Name = body.name
//     if(match=='desending')
//     {
//      myshort = {name:-1}
//     }
//     else if(match=="assending"){
//     myshort = {name:1}
//     }
//     else{
//       myshort = {name:0}
//     }
//   const result = await User.find().sort(myshort);
//   res.status(200).json({
//   result,
//   message: "Data get.",
//   });
//   } catch (error) {
//   res.status(500).json({
//   message:
//   error.message ||
//   "An unexpected error occure while processing your request.",
//   });
//   }
//   });

// Count number of recored found in user list by sorting for admin panel
app.post("/showUser1",async (req, res) => {
// First read existing users.
try {
   const {body}=req;
   const match = body.order;
    var myshort;
   var result;
    
    //const Name = body.name
    if(req.body.order && !req.body.name && !req.body.status && !req.body.gender){
      if(match=='desending')
    {
     myshort = {name:-1}
    }
    else if(match=="assending"){
    myshort = {name:1}
    }
    else{
      myshort = {name:0}
    }
    
    result = await User.find({role:"user"}).sort(myshort).count();
    
    }
    else if(req.body.name && !req.body.order && !req.body.status && !req.body.gender)
    {
      
      result = await User.count({name:{$regex:req.body.name ,$options:'i'},role:"user"},function (err, results) {});
    }
    else if(req.body.gender && !req.body.name && !req.body.order && !req.body.status)
    {
      
      result = await User.count({gender:req.body.gender ,role:"user"},function (err, results) {});
    }
    else if(req.body.status && !req.body.name && !req.body.order && !req.body.gender){
      
      result = await User.count({status:req.body.status ,role:"user"},function (err, results) {});
    }
    else if (req.body.name && req.body.order && req.body.status && req.body.gender) {

      result = await User.find({status:req.body.status,role:"user",name:{$regex:req.body.name ,$options:'i'} ,gender:req.body.gender}).sort(match=='assending'?{name:1}:{name:-1}).count();
    
    }else if(!req.body.order && !req.body.name && !req.body.status && !req.body.gender){

      result = await User.count({role:"user"},function (err, results) {});
    }


    else if (req.body.name && req.body.order && !req.body.status && !req.body.gender) {
      result = await User.find({name:{$regex:req.body.name ,$options:'i'},role:"user"}).sort(match=='assending'?{name:1}:{name:-1}).count();
    }
     else if (req.body.name && !req.body.order && req.body.status && !req.body.gender) {
      result = await User.find({status:req.body.status,role:"user",name:{$regex:req.body.name ,$options:'i'}}).count();
    }
     else if (req.body.name && !req.body.order && !req.body.status && req.body.gender) {
      result = await User.find({name:{$regex:req.body.name ,$options:'i'} ,gender:req.body.gender ,role:"user"}).count();
    }
     else if (!req.body.name && req.body.order && req.body.status && !req.body.gender) {
      result = await User.find({status:req.body.status ,role:"user"}).sort(match=='assending'?{name:1}:{name:-1}).count();
    }
     else if (!req.body.name && req.body.order && !req.body.status && req.body.gender) {
      result = await User.find({gender:req.body.gender ,role:"user"}).sort(match=='assending'?{name:1}:{name:-1}).count();
    }
     else if (!req.body.name && !req.body.order && req.body.status && req.body.gender) {
      result = await User.find({status:req.body.status,gender:req.body.gender ,role:"user"}).count();
    }
     else if (req.body.name && req.body.order && req.body.status && !req.body.gender) {
      result = await User.find({status:req.body.status,role:"user",name:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{name:1}:{name:-1}).count();
    }
    else if (req.body.name && !req.body.order && req.body.status && req.body.gender) {
      result = await User.find({status:req.body.status,role:"user",name:{$regex:req.body.name ,$options:'i'} ,gender:req.body.gender}).count();
    }
     else if (!req.body.name && req.body.order && req.body.status && req.body.gender) {
      result = await User.find({status:req.body.status,role:"user",gender:req.body.gender}).sort(match=='assending'?{name:1}:{name:-1}).count();
    }
    if(result){

res.status(200).json({
result,
message: "Data get.",
sucess:true
});
}
else{
res.status(200).json({
result,
message: "No "+(req.body.order || req.body.status || req.body.name ) +" user found.",
sucess:false
});
}
} catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
});

//get user by id 
app.get("/getuser/:_id", async (req, res) => {
  try {
    const result1 = await User.find({_id:req.params._id});
    if(result1){
    res.status(200).json({
      result1,
      message: "Data get."
    });}
  } catch (error) {
    res.status(500).json({
      message:
        error.message ||
        "An unexpected error occure while processing your request."
    });
  }
});

// Login user at user module side
app.post("/login",[
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
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message: errors.array(),
        success: false
      });
    }
    try {
      const { body } = req;
      const Email = body.email;
      const Password = body.password;
      const result = await User.findOne({ email: Email  ,role:"user"});
      if (!result) {
        res.status(400).json({
          message: "Email is not registerd.",
          success: false
        });
      }
      else if(result.status!="Active")
      {
         res.status(400).json({
          message: "Your account has been suspended by admin",
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
        //const today = new Date();
        //var time = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' / ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var time = moment().format('MMMM Do YYYY , h:mm:ss a');
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
        res.status(500).json({
        message: error.message || "unwanted error occurred."
      });
    }
  }
);
//admin login
app.post("/adminLogin",[
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
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message: errors.array(),
        success: false
      });
    }
   try {
     const { body } = req;
     const Email = body.email;
     const Password = body.password;
     const result = await User.findOne({ email: Email  });
     
     if (!result) {
       res.status(400).json({
         message: "Email is not registerd.",
         success: false
       });
     }
     const check = bcrypt.compareSync(Password, result.password);
     if (!check) {
       res.status(400).json({
         message: "Password  is incorrect.",
         success: false
       });
     } else if (result.role == "admin") {
       var time = moment().format('MMMM Do YYYY , h:mm:ss a');
       const result1 = await User.findOneAndUpdate(
         { email: Email },
         {
           $set: {
             lastLogin: time
           }
         }
       );
       const object = {
         ...result._doc
       };
       var token = jwt.sign(object, "nikita", { expiresIn: "24h" });
       res.status(200).json({
         token,
         result,
         message: "Logged in successfully!",
         success: true
       });
     } else {
       res.status(400).json({
         success: false,
         message: "only admin can login here !"
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
// admin password change
app.post("/changePassword",[
       check("newPassword")
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
      .withMessage(" Old password didn't match"),
      check("oldPassword")
      .not()
      .isEmpty()
      .withMessage("Old Password can't bt empty")],
async (req, res) => {
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message: errors.array(),
        success: false
      });
    }
    try{
const { body } = req;
const value = req.body.Cid;
Password = req.body.oldPassword;
const result = await User.findById({ _id: value });

if(result){
const check = bcrypt.compareSync(Password, result.password);

if (!check) {
res.status(400).json({
message: " Old password didn't match.",
success: false
});
} 
else {
      const Password = req.body.newPassword;
        const salt = bcrypt.genSaltSync(5);
        
        const hash = bcrypt.hashSync(Password, salt);
        
       // req.body.password = hash;
        const result = await User.findOneAndUpdate({ _id: value },{ $set:{password:hash } });

        if(result){
          res.status(200).json({      
  result,
  message: "Password Change Sucessfully"
  });
        }
        
}
}}catch (error) {
      res.status(500).json({
      message:error.message || "An unexpected error occure while processing your request.",
      sucess:false
      });
      }
}
);

//User Profile
app.post("/profile",async (req, res) => {

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



//********************************************* Product Detail **************************************************//


//Add the Product from the amin panel side 
app.post('/addProduct',upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'otherImg', maxCount: 8 }]),[
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
      const { body,files} = req;
      const len = files['otherImg'].length;
      const count = 0;
      console.log("hjds",files);
      var other= new Array();
      for(n=0;n<len;n++){
      other[n]= `${files['otherImg'][n].destination}${files['otherImg'][n].filename}`;
      }
      //const today = new Date();
        //var time = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' / ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
        var time = moment().format('MMMM Do YYYY , h:mm:ss a');
        body.createTime=time;
        body.updateTime=time;
        body.status="Active";
        body.count=count;
      const product = new Product({...body,thumbnail: `${files['thumbnail'][0].destination}${files['thumbnail'][0].filename}`,otherImg:other});
      const result = await product.save();
      if(!result){
          res.status(500).json({
              result,
              message: " Product  not add  sucessfull try again later",
              sucess:false
              });
      }else if(result){
        const count=await Product.find({status:"Active"}).count();
        console.log("count",count)
        if(count%2==0)

        {
        var Email1 = await NewsLetter.find({status:"Active"},{email:1,_id:0});
        var transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: "amits.chapter247@gmail.com",
            pass: "amit@247"
          }
        });
        readHTMLFile(__dirname + '/untitled.html', function(err, html) {
         // var html = document.getElementById("img").src;
    var template = handlebars.compile(html);
    var replacements = {
          
    };
    var htmlToSend = template(replacements);
        var mailOptions = {
          from: "amits.chapter247@gmail.com",
          to:Email1 ,
          subject: "Update ",
          html: htmlToSend


        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
            callback(error);
          } else {
            
            res.status(200).json({
              result,
              message: "Mail sent sucessfully"
            });
          }
        });
      });
      }
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
//Active product count for user module
app.get("/productCount",async(req,res) =>{
  try{
     
     var result=[];
    const result1 = await Category.find({status:"Active"},{_id:1});
    for(n=0;n<result1.length;n++){
     result[n] = await Product.find({status:"Active",category:result1[n]._id}).count();
  }
    if(result){
      res.status(200).json({
        result,
        message:"Count get"
      })
    }
  }catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
});
 
//Find the count of all the sort product
app.post("/showproduct1",async (req, res) => {
// First read existing users.
try {
  const { body } = req;
    const match = body.sort;
    const Name = body.category;
    
    var myshort;
    var result;

    if(req.body.sort && !req.body.category && !req.body.name && !req.body.status){
    if(match=='desending')
    {
     myshort = {price:-1};
      
    }
    else if(match=='assending'){
     
     myshort = {price:1};
     
    }

    result = await Product.find().sort(myshort).count();
  }
else if(req.body.category && !req.body.name && !req.body.sort && !req.body.status){

result = await Product.find({category:Name}).count();
}
else if(req.body.name && !req.body.category && !req.body.sort && !req.body.status){

  result = await Product.find({name:{$regex:req.body.name ,$options:'i'}}).count();
}
else if (req.body.status && !req.body.category && !req.body.name && !req.body.sort){

  result = await Product.find({status:req.body.status}).count();
}
else if(req.body.sort && req.body.category && req.body.name && req.body.status){

  result = await Product .find({category:Name,status:req.body.status,name:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{price:1}:{price:-1}).count();

}
else if(!req.body.sort && !req.body.category && !req.body.name && !req.body.status){

  result = await Product.find().sort({createTime:-1}).count();
}


else if(req.body.sort && req.body.category && !req.body.name && !req.body.status){

  result = await Product .find({category:Name}).sort(match=='assending'?{price:1}:{price:-1}).count();

}
else if(req.body.sort && !req.body.category && req.body.name && !req.body.status){

  result = await Product .find({name:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{price:1}:{price:-1}).count();

}
else if(req.body.sort && !req.body.category && !req.body.name && req.body.status){

  result = await Product .find({status:req.body.status}).sort(match=='assending'?{price:1}:{price:-1}).count();

}
else if(!req.body.sort && req.body.category && req.body.name && !req.body.status){

  result = await Product .find({category:Name,name:{$regex:req.body.name ,$options:'i'}}).count();

}
else if(!req.body.sort && req.body.category && !req.body.name && req.body.status){

  result = await Product .find({category:Name,status:req.body.status}).count();

}
else if(!req.body.sort && !req.body.category && req.body.name && req.body.status){

  result = await Product .find({status:req.body.status,name:{$regex:req.body.name ,$options:'i'}}).count();

}
else if(req.body.sort && req.body.category && req.body.name && !req.body.status){

  result = await Product .find({category:Name,name:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{price:1}:{price:-1}).count();

}
else if(req.body.sort && !req.body.category && req.body.name && req.body.status){

  result = await Product .find({status:req.body.status,name:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{price:1}:{price:-1}).count();

}
else if(!req.body.sort && req.body.category && req.body.name && req.body.status){

  result = await Product .find({category:Name,status:req.body.status,name:{$regex:req.body.name ,$options:'i'}}).count();

}
  // result = await Product.count({},function (err, results) {});
 if(result){
res.status(200).json({
result,
message: "Data get.",
success:true
});}
else{
res.status(200).json({
result,
message:"No "+(req.body.sort || req.body.category || req.body.status || req.body.name ) +" product found.",
success:false
});
}
} catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
}); 



// search product by price , name ,status ,category 
app.post("/searchProductByPrice",async (req, res) => {
  // First read existing users.
  try {
    const { body } = req;
    const match = body.sort;
    const Name = body.category;
    const Skip =req.body.skip;
    const Limit =req.body.limit;
    var myshort;
    var result;
  
    if(req.body.sort && !req.body.category && !req.body.name && !req.body.status){
    if(match=='desending')
    {
     myshort = {price:-1};
      
    }
    else if(match=='assending'){
     
     myshort = {price:1};
     
    }

    result = await Product.find().sort(myshort).limit(Limit).skip(Skip);
  }
else if(req.body.category && !req.body.name && !req.body.sort && !req.body.status){

result = await Product.find({category:Name}).limit(Limit).skip(Skip);
}
else if(req.body.name && !req.body.category && !req.body.sort && !req.body.status){

  result = await Product.find({name:{$regex:req.body.name ,$options:'i'}}).limit(Limit).skip(Skip);
}
else if (req.body.status && !req.body.category && !req.body.name && !req.body.sort){

  result = await Product.find({status:req.body.status}).limit(Limit).skip(Skip);
}
else if(req.body.sort && req.body.category && req.body.name && req.body.status){

  result = await Product .find({category:Name,status:req.body.status,name:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{price:1}:{price:-1}).limit(Limit).skip(Skip);

}
else if(!req.body.sort && !req.body.category && !req.body.name && !req.body.status){

  result = await Product.find().sort({createTime:-1}).limit(Limit).skip(Skip);
}


else if(req.body.sort && req.body.category && !req.body.name && !req.body.status){

  result = await Product .find({category:Name}).sort(match=='assending'?{price:1}:{price:-1}).limit(Limit).skip(Skip);

}
else if(req.body.sort && !req.body.category && req.body.name && !req.body.status){

  result = await Product .find({name:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{price:1}:{price:-1}).limit(Limit).skip(Skip);

}
else if(req.body.sort && !req.body.category && !req.body.name && req.body.status){

  result = await Product .find({status:req.body.status}).sort(match=='assending'?{price:1}:{price:-1}).limit(Limit).skip(Skip);

}
else if(!req.body.sort && req.body.category && req.body.name && !req.body.status){

  result = await Product .find({category:Name,name:{$regex:req.body.name ,$options:'i'}}).limit(Limit).skip(Skip);

}
else if(!req.body.sort && req.body.category && !req.body.name && req.body.status){

  result = await Product .find({category:Name,status:req.body.status}).limit(Limit).skip(Skip);

}
else if(!req.body.sort && !req.body.category && req.body.name && req.body.status){

  result = await Product .find({status:req.body.status,name:{$regex:req.body.name ,$options:'i'}}).limit(Limit).skip(Skip);

}
else if(req.body.sort && req.body.category && req.body.name && !req.body.status){

  result = await Product .find({category:Name,name:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{price:1}:{price:-1}).limit(Limit).skip(Skip);

}
else if(req.body.sort && !req.body.category && req.body.name && req.body.status){

  result = await Product .find({status:req.body.status,name:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{price:1}:{price:-1}).limit(Limit).skip(Skip);

}
else if(!req.body.sort && req.body.category && req.body.name && req.body.status){

  result = await Product .find({category:Name,status:req.body.status,name:{$regex:req.body.name ,$options:'i'}}).limit(Limit).skip(Skip);

}
  if(result){
  res.status(200).json({
  result,
  message: "Data get.",
  });}
} catch (error) {
  res.status(500).json({
  message:
  error.message ||
  "An unexpected error occure while processing your request.",
  });
  }
  }); 

// searching at user module side 
// search product by price , name ,status ,category 
app.post("/searchProductByPrice1",async (req, res) => {
  // First read existing users.
  try {
    const { body } = req;
    const match = body.sort;
    const Name = body.category;
    const Name1 = body.name;
    var myshort;
    var result =[];
    

    const result1 = await Category.find({status:"Active"},{_id:1});
    for(n=0;n<result1.length;n++){
  
//     if(req.body.sort && !req.body.category && !req.body.name ){
//     if(match=='desending')
//     {
//      myshort = {price:-1};
      
//     }
//     else if(match=='assending'){
     
//      myshort = {price:1};
     
//     }
    

//     result[n] = await Product.find({status:"Active",category:result1[n]._id}).sort(myshort);
//   }
// else if(req.body.category && !req.body.name && !req.body.sort ){

// result[n] = await Product.find({category:Name,status:"Active",category:result1[n]._id});
// }
 if(req.body.name && !req.body.category && !req.body.sort ){

  result[n] = await Product.find({name:{$regex:req.body.name ,$options:'i'},status:"Active",category:result1[n]._id});
}

// else if(req.body.sort && req.body.category && req.body.name ){

//   result[n] = await Product .find({category:Name,name:Name1 }).sort(match=='assending'?{price:1}:{price:-1});

// }
else if(!req.body.sort && !req.body.category && !req.body.name ){

  result[n] = await Product.find({status:"Active" ,category:result1[n]._id});
}
}
// if(req.body.category && !req.body.name && !req.body.sort ){

// result = await Product.find({category:Name,status:"Active"});
// }
  if(result){
  res.status(200).json({
  result,
  message: "Data get.",
  });}
  else{
  res.status(400).json({
  result,
  message: "Data Not get.",
  });
  }
} catch (error) {
  res.status(500).json({
  message:
  error.message ||
  "An unexpected error occure while processing your request.",
  });
  }
  });
//show the  product count according to category
app.post("/showproductCount",async (req, res) => {
try {
  const { body } = req;
  const C_id =req.body.Cid;
 
var result = await Product.find({category: C_id}).count();
if(result){
res.status(200).json({
result,
message: "Data get.",
});}
else{
  result=0;
  res.status(200).json({
result,
message: "Data get.",
});
}
} catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
});    

//Product List for admin panel
app.post("/showproduct",async (req, res) => {

try {
  const { body } = req;
  const Skip =req.body.skip;
  const Limit =req.body.limit;
const result = await Product.find().limit(Limit).skip(Skip);
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

//get all active  category product for user module
app.post("/getProduct",async (req, res) => {
try {
  const { body } = req;
  const Skip =req.body.skip;
  const Limit =req.body.limit;
  //.limit(parseInt(Limit)).skip(parseInt(Skip))
  var result=[];
  const result1 = await Category.find({status:"Active"},{_id:1});
  if(result1){
    for(n=0;n<result1.length;n++){
 result[n] = await Product.find({status:"Active",category:result1[n]._id});
}
}
if(result){
res.status(200).json({
result,
message: "Data get.",
});}
} catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
});
//get all product
// app.get("/getProductt",async (req, res) => {
// try {
//   const { body } = req;
 
// const result = await Product.find();
// res.status(200).json({
// result,
// message: "Data get.",
// });
// } catch (error) {
// res.status(500).json({
// message:
// error.message ||
// "An unexpected error occure while processing your request.",
// });
// }
// });


//Search product
app.post("/searchProduct",async (req, res) => {
  // First read existing users.
  try {
    const { body } = req;
    
    const Name = body.name;
   
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
//Search product by cat
app.post("/searchProductByCat",async (req, res) => {
  // First read existing users.
  try {
    const { body,query } = req;
    
    const Name = body.category;
   
  const result = await Product.find({category:Name ,status:"Active"});
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





app.post("/searchProductById/:id",async (req, res) => {
  // First read existing users.
  try {
    const { body } = req;    
    var result;
    var myshort;
    if(req.body.sort){
    result = await Product .find({category:req.params.id ,status:"Active"}).sort(req.body.sort=='assending'?{price:1}:{price:-1});
    }else{
      result = await Product.find({category:req.params.id,status:"Active"});
    }
  if(result){
  res.status(200).json({
  result,
  message: "Data get.",
  });}
  else{
  res.status(400).json({
  result,
  message: "Data not get.",
  });
  }
  } catch (error) {
  res.status(500).json({
  message:
  error.message ||
  "An unexpected error occure while processing your request.",
  });
  }
  });
// Rectnly add product
app.get("/newProduct",async (req,res) =>{
  try{
    const result = await Product.find({status:"Active"}).sort({createTime:-1}).limit(10);
    if(result){
      res.status(200).json({
        result,
        message:"Data get ",
      })
    }
  }catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
}) ;

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

app.post("/profileUpdate/:id",upload.single('file'),[check("name")
     .not()
     .isEmpty()
     .withMessage("Name can't be empty").isLength({min:2}).withMessage("Name field should have atleast 2 charaters.",
).isLength({max:50}).withMessage("Name field couldn't have more tahn 50 charaters.").not().isInt().withMessage("Only charaters are allowed."),
   //Email validation

   check("mobile_no")
     .not()
     .isEmpty()
     .withMessage("Mobile no. cant be empty")
     .isInt()
     .withMessage("Characters are not allowed")
     .isLength({ min: 7 })
     .withMessage("Mobile_no should be atleast 7 digit long.")
     .isLength({ max: 14 })
     .withMessage("Mobile_no couldn't have more than 14 digit.")],async (req, res) => {
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
  const { body,file } = req;
  var time = moment().format('MMMM Do YYYY , h:mm:ss a');
  body.updateTime=time;
  let obj = body;
  //body.imageUpdated = true;
  if (body.imageUpdated === 'true') {
  obj = {
  ...obj,
  file: `${file.destination}${file.filename}`
  };
  }
  const result = await User.findOneAndUpdate({ _id: req.params.id},{$set: obj});
  const result1 = await result.save();
  
    res.status(200).json({
      files: req.file,
      body: req.body,
  result1,
  message: "data updated"
  })
  } catch (error) {
  res.status(500).json({
message:
errors.message ||
"An unexpected error occure while processing your request."
});
  }
  });

app.post("/ProfileUpdate1/:id/:status",async(req,res)=>{
  try{
    const{params}=req;
    var Status;

     if(params.status==="Active"){
          Status="Inactive";
     }
     else{
      Status="Active";
     }
 
 const result = await User.findByIdAndUpdate({_id:req.params.id},{$set:{status:Status}});
 if(result){
  res.status(200).json({
    result,
    message:"User status updated sucessfully"
  }) }
  }catch (error) {
  res.status(500).json({
message:
errors.message ||
"An unexpected error occure while processing your request."
});
  }
})
app.post("/profileUpdate",upload.single('file'),async (req, res) => {
  try {
  const { body,file } = req;
  var time = moment().format('MMMM Do YYYY , h:mm:ss a');
  body.updateTime=time;
  let obj = body;
  //body.imageUpdated = true;
  if (body.imageUpdated === 'true') {
  obj = {
  ...obj,
  file: `${file.destination}${file.filename}`
  };
  }
  const result = await User.findOneAndUpdate({ _id: req.body.Cid},{$set: obj});
  const result1 = await result.save();
  
    res.status(200).json({
      files: req.file,
      body: req.body,
  result1,
  message: "data updated"
  })
  } catch (error) {
  res.status(500).json({
  message: error.message
  });
  }
  });

app.post("/getItem",async (req, res) => {
  try {
    var n=1;
    console.log(req.body);
  const result = await Product.findById({ _id: req.body.data });
  if(result){

    const no =result.count;
    const response = await Product.findOneAndUpdate({ _id: req.params._id },{$set:{count:no+n}});
    console.log(result.count);
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
app.post("/getItem/:_id",async (req, res) => {
  try {
    var n=1;
  const result = await Product.findById({ _id: req.params._id });
  if(result){

    const no =result.count;
    const response = await Product.findOneAndUpdate({ _id: req.params._id },{$set:{count:no+n}});
    console.log(result.count);
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

//most visited producted
app.get("/visitProduct",async (req, res) => {
  // First read existing users.
  try {
    var myshort ={count:-1};

  const result = await Product.find().sort(myshort).limit(10);
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
//get product 
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
  app.post("/editItem/:_id",upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'otherImg', maxCount: 8 }]),[check("name").not().isEmpty().withMessage("Product name is required.").isLength({min:2}).withMessage("Product name should have atleast two Characters.").isLength({max:50}).withMessage("product name couldn't have more than 50 charaters."),check("price").not().isEmpty().withMessage("Price is required.").isLength({min:2}).withMessage("price should contain atleast 2 digits.").isLength({max:6}).withMessage("price couldn't be more than 6 digits long."),check("quantity").not().isEmpty().withMessage("quantity is required.")],async (req, res) => {
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
  const { body,files } = req;
 
      //const today = new Date();
      //var time = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' / ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();  
      var time = moment().format('MMMM Do YYYY , h:mm:ss a');
      body.updateTime =time;
      // const res = await Product.find({_id:req.params._id});
      // console.log("counttttt",res);
      //body.imageUpdated=true;
      let obj = body;
  if (body.imageUpdated === 'true') {

 
  obj = {
  ...obj,
  thumbnail: `${files['thumbnail'][0].destination}${files['thumbnail'][0].filename}`
  };
  }
  if(body.imageUpdated1 === 'true'){
    const len = files['otherImg'].length; 
  var other= new Array();
      for(n=0;n<len;n++){
      other[n]= `${files['otherImg'][n].destination}${files['otherImg'][n].filename}`;
      }

      obj = {
        ...obj,otherImg:other
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
message:
errors.message ||
"An unexpected error occure while processing your request."
});
}
  }); 

app.post("/editProduct/:id/:status",async(req,res)=>{
  try{
    const{params}=req;
    if(params.status==="Active"){
      Status="Inactive";
    }else{
      Status="Active";
    }
    const result = await Product.findByIdAndUpdate({_id:req.params.id},{$set:{status:Status}});
    if(result){
      res.status(200).json({
        result,
        message:"Product status updated sucessfully"
      })
    }
  }catch (error) {
res.status(500).json({
message:
errors.message ||
"An unexpected error occure while processing your request."
});
}
})   


app.post("/forgotPassword", [
  check("email")
    .not().isEmpty().withMessage("Email is required.")
    .isEmail().withMessage('Please enter the valid email address.')
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
        email: req.body.email ,role:"admin"
      });
      if (!user) {
        console.error("email not in database");
        res.status(400).json({
          message: "Email isn't registerd, Plesae enter a registerd email address.",
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
              "Please click on the following link, or paste this into your browser to complete the process within 15 minutes of receiving it:\n\n" +
              `http://localhost:3000/reset/${token}\n\n` +
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

//forget password for  user
app.post("/forgotPasswordUser", [
  check("email")
    .not().isEmpty().withMessage("Email is required")
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
        email: req.body.email ,role:"user"   
      });
      if (!user) {
        console.error("email not in database");
        res.status(400).json({
          message: "Email does not exist, Please enter registerd email address ",
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
              user: "amits.chapter247@gmail.com",
              pass: "amit@247"
            }
          });

          const mailOptions = {
            from: "amits.chapter247@gmail.com",
            to: `${user.email}`,
            subject: "Link To Reset Password",
            text:
              "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
              "Please click on the following link, or paste this into your browser to complete the process within 15 minutes of receiving it:\n\n" +
              `http://localhost:3000/reset/${token}\n\n` +
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



app.delete("/deleteUser/:id", async (req, res) => {
  // First read existing users.
  try {
    const { params } = req;
    const result = await User.findByIdAndDelete({_id:req.params.id});
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
app.post("/category",[
  check("category")
  .not().isEmpty().withMessage("Category field is required")
  .isLength({min:2}).withMessage("Category name field should have minimum 2 character")
  .isLength({max:30}).withMessage("Category name field should have maximum 30 character")
  ] ,async (req, res) => {
     const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message: errors.array(),
        success: false
      });
    }
  try {
    const { body } = req;
    //const today = new Date();
    //var time = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' / ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var time = moment().format('MMMM Do YYYY , h:mm:ss a');
    req.body.createTime=time;
    req.body.updateTime=time;
    req.body.status="Active";
    const result = await new Category({ ...body });
    const result1 = await result.save();
    if(result1){
    res.status(200).json({
      result1,
      message: "category added !"
    });
  }
  } catch (error) {
  res.status(500).json({
  message: error.message || "unwanted error occured"
  });
  }
});
app.post("/getCat", async (req, res) => {
 try {
   const { body } = req;
 const Skip =req.body.skip;
  const Limit =req.body.limit;
    const result1 = await Category.find().limit(Limit).skip(Skip);
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
app.post("/editCategory/:id",[
check("category")
.not().isEmpty().withMessage("Category name can't be empty")
.isLength({min:2}).withMessage("Category name field should have minimum 2 character")
  .isLength({max:30}).withMessage("Category name field should have maximum 30 character")
  ] ,async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message: errors.array(),
        success: false
      });
    }
 try {
   const { body } = req;
  // const today = new Date();
   //var time = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' / ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
   var time = moment().format('MMMM Do YYYY , h:mm:ss a');
   req.body.updateTime=time;
   var response
   const result = await Category.findByIdAndUpdate(
     { _id: req.params.id },
     { $set: { ...body } }
   );
   if(result){
    // if(body.status){
    //    response = await Product.updateMany({category:req.params.id},{$set:{status:req.body.status}});
    // }
   
   //const result1 = await result.save();
   res.status(200).json({
     result,
     response,
     message: "Save changes !"
   });}
 } catch (error) {
   res.status(400).json({
     message: error.message || "unexpeced error occured."
   });
 }
});

app.post("/editCategory/:id/:status",async(req,res)=>{
  try{
    const{params}=req;
    var Status;
    if(params.status==="Active"){
      Status="Inactive";
    }else{
      Status="Active";
    }

    const result = await Category.findByIdAndUpdate({_id:req.params.id},{$set:{status:Status}});
    if(result){
      res.status(200).json({
        result,
        message:"Category status updated sucessfully"
      })
    }
  }catch (error) {
   res.status(400).json({
     message: error.message || "unexpeced error occured."
   });
 }
})
app.get("/getCategory/:id", async (req, res) => {
 try {
   const result1 = await Category.find({ _id: req.params.id });
   res.status(200).json({
     result1,
     message: "data get !"
   });
 } catch (error) {
   console.log(error);
   res.status(400).json({
     message: error.message || "Data did't get!"
   });
 }
});
app.post("/getCategory", async (req, res) => {
 try {
   const result = await Category.find({ _id: req.body.category ,status:"Active"});
   res.status(200).json({
     result,
     message: "data get !"
   });
 } catch (error) {
   console.log(error);
   res.status(400).json({
     message: error.message || "Data did't get!"
   });
 }
});
app.get("/getCategory", async (req, res) => {
 try {
   const result1 = await Category.find();
   res.status(200).json({
     result1,
     message: "data get !"
   });
 } catch (error) {
   console.log(error);
   res.status(400).json({
     message: error.message || "Data did't get!"
   });
 }
});
app.get("/getCategory1", async (req, res) => {
 try {
   const result1 = await Category.find({status:"Active"});
   res.status(200).json({
     result1,
     message: "data get !"
   });
 } catch (error) {
   console.log(error);
   res.status(400).json({
     message: error.message || "Data did't get!"
   });
 }
});
app.post("/getCatByName", async (req, res) => {
 try {
  const{body}=req
   const result1 = await Category.find({ category: req.body.category });
   res.status(200).json({
     result1,
     message: "data get !"
   });
 } catch (error) {
   console.log(error);
   res.status(400).json({
     message: error.message || "Data did't get!"
   });
 }
});
app.delete("/deleteCategory/:id", async (req, res) => {
 try {
   const result = await Category.findByIdAndDelete({ _id: req.params.id });
   res.status(200).json({
     message: "Category deleted successfully !"
   });
 } catch (error) {
   res.status(400).json({
     message: error.message
   });
 }
});
//Count category list
app.post("/showCat1",async (req, res) => {
// First read existing users.
try {
    const {body}=req;
    const match = body.order;
    var myshort;
    var result1

  if(req.body.order && !req.body.name && !req.body.status){
    if(match=='desending')
    {
     myshort = {category:-1};
      
    }
    else if(match=="assending"){
    myshort = {category:1};
     
    }
    else{
      myshort = {category:0};
       
    }
   
    result1 = await Category.find().sort(myshort).count();
    }
    else if(req.body.name && !req.body.order && !req.body.status)
    {
      result1 = await Category.find({category:{$regex:req.body.name ,$options:'i'}}).count();
    }
    else if(req.body.status && !req.body.name && !req.body.order){
       result1 = await Category.find({status:req.body.status}).count();
    }
    else if (req.body.name && req.body.order && req.body.status) {
      result1 = await Category.find({category:{$regex:req.body.name ,$options:'i'},status:req.body.status}).sort(match=='assending'?{category:1}:{category:-1}).count();
    }
    else if(!req.body.name && !req.body.order && !req.body.status){
      result1 = await Category.find().sort({createTime:-1}).count();
    }
    else if(req.body.status && req.body.name && !req.body.order){
       result1 = await Category.find({status:req.body.status ,category:{$regex:req.body.name ,$options:'i'}}).count();
    }
     else if(req.body.status && !req.body.name && req.body.order){
       result1 = await Category.find({status:req.body.status}).sort(match=='assending'?{category:1}:{category:-1}).count();
    }
    else if(!req.body.status && req.body.name && req.body.order){
       result1 = await Category.find({category:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{category:1}:{category:-1}).count();
    }
  
if(result1){
res.status(200).json({
result1,
message: "Data get.",
success:true
});}
else{
res.status(200).json({
result1,
message: "No "+(req.body.order || req.body.status || req.body.name ) +" category found.",
success:false
});
}
} catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
});

app.post("/showCategoryName",async(req,res)=>{
  try{
    const{body}=req;
    const result = await Category.find({_id:req.body.category},{category:1,_id:0})
    if(result){
      res.status(200).json({
        result,
        message:"Name get."
      })
    }
  } catch (error) {
res.status(500).json({
message:
error.message ||
"An unexpected error occure while processing your request.",
});
}
})
//get category by name order
// app.post("/getCatByOrder",async (req, res) => {
//   // First read existing users.
//   try {
//     const { body } = req;
//     const match = body.order;
//     var myshort;
//     //const Name = body.name
//     if(match=='desending')
//     {
//      myshort = {category:-1}
//     }
//     else if(match=="assending"){
//     myshort = {category:1}
//     }
//     else{
//       myshort = {name:0}
//     }
//   const result = await Category.find().sort(myshort);
//   res.status(200).json({
//   result,
//   message: "Data get.",
//   });
//   } catch (error) {
//   res.status(500).json({
//   message:
//   error.message ||
//   "An unexpected error occure while processing your request.",
//   });
//   }
//   });

//get cat bt name 
app.post("/getCatByNamee", async (req, res) => {
  try {
    const {body}=req;
    const match = body.order;
    const Skip =req.body.skip;
    const Limit =req.body.limit;
    var myshort;
    var result1
    //const Name = body.name
    if(req.body.order && !req.body.name && !req.body.status){
    if(match=='desending')
    {
     myshort = {category:-1};
      
    }
    else if(match=="assending"){
    myshort = {category:1};
     
    }
    else{
      myshort = {category:0};
       
    }
   
    result1 = await Category.find().sort(myshort).limit(Limit).skip(Skip);
    }
    else if(req.body.name && !req.body.order && !req.body.status)
    {
      result1 = await Category.find({category:{$regex:req.body.name ,$options:'i'}}).limit(Limit).skip(Skip);
    }
    else if(req.body.status && !req.body.name && !req.body.order){
       result1 = await Category.find({status:req.body.status}).limit(Limit).skip(Skip);
    }
    else if (req.body.name && req.body.order && req.body.status) {
      result1 = await Category.find({category:{$regex:req.body.name ,$options:'i'},status:req.body.status}).sort(match=='assending'?{category:1}:{category:-1}).limit(Limit).skip(Skip);
    }
    else if(!req.body.name && !req.body.order && !req.body.status){
      result1 = await Category.find().sort({createTime:-1}).limit(Limit).skip(Skip);
    }
     else if(req.body.status && req.body.name && !req.body.order){
       result1 = await Category.find({status:req.body.status ,category:{$regex:req.body.name ,$options:'i'}}).limit(Limit).skip(Skip);
    }
     else if(req.body.status && !req.body.name && req.body.order){
       result1 = await Category.find({status:req.body.status}).sort(match=='assending'?{category:1}:{category:-1}).limit(Limit).skip(Skip);
    }
    else if(!req.body.status && req.body.name && req.body.order){
       result1 = await Category.find({category:{$regex:req.body.name ,$options:'i'}}).sort(match=='assending'?{category:1}:{category:-1}).limit(Limit).skip(Skip);
    }
    if(result1){
    res.status(200).json({
      result1,
      message: "Data get."
    });}
  } catch (error) {
    res.status(500).json({
      message:
        error.message ||
        "An unexpected error occure while processing your request."
    });
  }
});



app.post("/addEmail",[
  check("email")
      .not()
      .isEmpty()
      .withMessage("Email can't be empty")
      .isEmail()
      .withMessage("Enter the valid email")
      .trim()
      .custom(async (email, { req, res }) => {
        const userData = await User.findOne({ email });
        const newsData = await NewsLetter.findOne({email})
        console.log(userData);
        if (userData) {
          throw new Error("Email address already exist.");
        }
        if(newsData){
          throw new Error("Email address already exist from newsletter.");
        }
      }).withMessage("Email address already exist.")], async(req,res) =>{
        const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        message: errors.array(),
        success: false
      });
    }

  try{
    const{body}=req;
    const today = new Date();
    var time = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' / ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    req.body.createTime=time;
    req.body.updateTime=time;
    req.body.status="Active";
    const result1 = await new NewsLetter({ ...body });
    const result = await result1.save();
    res.status(200).json({
      result1,
      message: "Email added !"
    });

  }  catch (error) {
    res.status(500).json({
      message:
        error.message ||
        "An unexpected error occure while processing your request."
    });
  }
});

// add to cart details
// app.post("/cart",[
//   check("address")
//   .not().isEmpty().withMessage("Address can't be empty."),
//   check("city")
//   .not().isEmpty().withMessage("City can't be empty."),
//   check("state")
//   .not().isEmpty().withMessage("State can't be empty."),
//   check("zip")
//   .not().isEmpty().withMessage("Zip can't be empty."),
//   check("cardnumber")
//   .not().isEmpty().withMessage("Cardnumber can't be empty.")
//   .isNumeric().withMessage("Cardnumber only conatin a  numeric value.")
//   .isLength({min:12}).withMessage("Type the correct cardnumber.")
//   .isLength({max:19}).withMessage("Type the correct cardnumber."),
//   check("month")
//   .not().isEmpty().withMessage("Expiry date can't be empty."),
//   check("cvv")
//   .not().isEmpty().withMessage("Cvv number can't be empty.")
//   .isNumeric().withMessage("Cvv only conatin a numeric value.")
//   .isLength({min:3 }).withMessage("Type the correct  cvc number")
//   .isLength({max:3}).withMessage("Type the correct  cvc number")
//   ],async(req,res)=>{
//        const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(422).json({
//         message: errors.array(),
//         success: false
//       });
//     }
//     try{
//   const{body}=req;
//   const today = new Date();
//     var time = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' / ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
//     req.body.createTime=time;
//     req.body.updateTime=time;
//     req.body.status="Active";
//     const result1 = await new Cart({ ...body });
//     const result = await result1.save();
//     if(result){
//     res.status(200).json({
//       result1,
//       message: "Card details added !"
//     });}
//   }catch (error) {
//     res.status(500).json({
//       message:
//         error.message ||
//         "An unexpected error occure while processing your request."
//     });
//   }
// });

app.post("/getNewsLetter",async (req,res)=>{

  try{
    const {body}=req;
    const match = body.order;
    const Skip =req.body.skip;
    const Limit =req.body.limit;
    var myshort;
    var result
    //const Name = body.name
    if(req.body.order && !req.body.email && !req.body.status){
    if(match=='desending')
    {
     myshort = {email:-1};
      
    }
    else if(match=="assending"){
    myshort = {email:1};
     
    }
    else{
      myshort = {email:0};
       
    }
   
    result = await NewsLetter.find().sort(myshort).limit(Limit).skip(Skip);
    }
    else if(req.body.email && !req.body.order && !req.body.status)
    {
      result = await NewsLetter.find({email:req.body.email}).limit(Limit).skip(Skip);
    }
    else if(req.body.status && !req.body.email && !req.body.order){
       result = await NewsLetter.find({status:req.body.status}).limit(Limit).skip(Skip);
    }
    else if (req.body.email && req.body.order && req.body.status) {
      result = await NewsLetter.find({email:req.body.email,status:req.body.status}).sort(match=='assending'?{email:1}:{email:-1}).limit(Limit).skip(Skip);
    }
    else if(!req.body.email && !req.body.order && !req.body.status){
      result = await NewsLetter.find().limit(Limit).skip(Skip);
    }
    
    if(result){
      res.status(200).json({
        result,
        message:"Data get.",
        sucess:true
      })
    }
  } catch (error) {
    res.status(500).json({
      message:
        error.message ||
        "An unexpected error occure while processing your request."
    });
  }
  
})

app.post("/newsletterCount",async(req,res)=>{
  try{
     const {body}=req;
    const match = body.order;
    var myshort;
    var result1

  if(req.body.order && !req.body.email && !req.body.status){
    if(match=='desending')
    {
     myshort = {email:-1};
      
    }
    else if(match=="assending"){
    myshort = {email:1};
     
    }
    else{
      myshort = {email:0};
       
    }
   
    result1 = await NewsLetter.find().sort(myshort).count();
    }
    else if(req.body.email && !req.body.order && !req.body.status)
    {
      result1 = await NewsLetter.find({email:req.body.email}).count();
    }
    else if(req.body.status && !req.body.email && !req.body.order){
       result1 = await NewsLetter.find({status:req.body.status}).count();
    }
    else if (req.body.email && req.body.order && req.body.status) {
      result1 = await NewsLetter.find({email:req.body.email,status:req.body.status}).sort(match=='assending'?{email:1}:{email:-1}).count();
    }
    else if(!req.body.name && !req.body.order && !req.body.status){
      result1 = await NewsLetter.find().count();
    }
    
    if(result1){
      res.status(200).json({
        result1,
        message:"Data get",
        sucess:true
      })
    }
    else{
      res.status(200).json({
        result1,
        message:"No "+(req.body.order || req.body.status || req.body.email ) +" news-letter found.",
      })
    }
  } catch (error) {
    res.status(500).json({
      message:
        error.message ||
        "An unexpected error occure while processing your request."
    });
  }
})

app.delete("/deleteNewsLetter/:id", async (req, res) => {
 try {
   const result = await NewsLetter.findByIdAndDelete({ _id: req.params.id });
   res.status(200).json({
     message: "Email deleted successfully !"
   });
 } catch (error) {
   res.status(400).json({
     message: error.message
   });
 }
});

app.post("/UpdateNewsLetter/:id/:status",async(req,res)=> {
  try{
 const{params}=req ;
 var Status ;
 if(params.status==="Active")
 {
    Status="Inactive";
 }
 else {
  Status="Active"
 }

const result = await NewsLetter.findByIdAndUpdate({_id:req.params.id},{$set:{status:Status}});
if(result){
  res.status(200).json({
    result,
    message:"Status updated successfully"
  })
}

  }catch (error) {
   res.status(400).json({
     message: error.message
   });
 }


});

// Api for payment
app.post("/payment", async (req, res) => {
  let status;
  try {
   console.log("bodyyyy",req.body);
   var time = moment().format('MMMM Do YYYY , h:mm:ss a');
   
    const charge = await stripe.charges.create({
      amount: req.body.amount,
      currency: "usd",
      source: req.body.token.id, // obtained with Stripe.js
      receipt_email: req.body.email,
      description: "Payment has been successfully received!! #Shopping-App"
    });
    console.log("Charge:", charge);
    status = "success";
    if(charge){
const result = await Product.findOne({_id:req.body.productid});
   
    if(result){
      var quentity = result.quantity-req.body.quantity;

      const result1 = await Product.findOneAndUpdate({_id:req.body.productid},{$set:{quantity:quentity}});
       
      const orderchild= new Orderchild({cid:req.body.data.Cid, createTime:time,trans_id:charge.id ,name:result.name,price:result.price,file:result.thumbnail, product_id:req.body.productid , quantity: req.body.quantity , amount: req.body.amount});
      const resresponse =await orderchild.save();
    }
    
      var transporter = nodemailer.createTransport({
          service: "gmail",
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          auth: {
            user: "amits.chapter247@gmail.com",
            pass: "amit@247"
          }
        });
        var mailOptions = {
          from: "amits.chapter247@gmail.com",
          to: req.body.token.email,
          subject: "Payment",
          text: "Thankyou for ordering with us!! Your payment has been successfully received. ",
          html:{path: charge.receipt_url}
          
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            
            res.status(200).json({
              result,
              message: "Mail sent sucessfully"
            });
          }
        });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    status = "failure";
    res.json({ success:false });
  }
});

app.post("/orderhistory", async (req, res) => {
 
 try {
   const value = req.body.Cid;
   
   const result = await Orderchild.find({cid:value}).sort({createTime:-1});
   if(result){
        
   res.status(200).json({
     result,
     message: "Order history get.",
   });}
   else{
    res.status(200).json({
     result,
     message: "No order history find",
   });
   }
 } catch (error) {
   res.status(500).json({
     message:
       error.message ||
       "An unexpected error occure while processing your request.",
   });
 }
});

app.post("/searchid",async (req, res) => {
  // First read existing users.
  try {
    const { body } = req;
    var result1;
    const Id = body.value;
    var time = moment().format('MMMM Do YYYY , h:mm:ss a');
    const result2  = await RecentProduct.find({cid:req.body.Cid ,id:req.body.value});
    if(result2==""|| !result2){
  const result = await  new RecentProduct({...body ,id:Id ,createTime:time ,cid:req.body.Cid});
   result1=await result.save();
   if(result1){
  res.status(200).json({
  result1,
  message: "Data get.",
  });}}
  else{
    res.status(200).json({
      result2,
      message:"Same image"
    })
  }
  } catch (error) {
  res.status(500).json({
  message:
  error.message ||
  "An unexpected error occure while processing your request.",
  });
  }
  });
    

//get product in limit
app.post("/getproductlimit",async (req, res) => {
try {
  const { body } = req;
 const Limit =6;
 var result =[];
const result1 = await RecentProduct.find({cid:req.body.Cid}).sort({createTime:-1}).limit(Limit);
for(n=0;n<result1.length;n++){
    result[n] = await Product.find({_id:result1[n].id ,status:"Active"})
}
res.status(200).json({
result,
result1,
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


var server = app.listen(8080, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log("Example app listening at http://%s:%s", host, port);
});
