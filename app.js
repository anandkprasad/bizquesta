var express = require('express');
var passport = require("passport");
var bodyParser  = require("body-parser");
var mongoose = require("mongoose");
var methodOverride = require("method-override");
var LocalStrategy= require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var flash = require("connect-flash");
const { v4: uuidv4 } = require('uuid');

var app = express();

mongoose.connect('mongodb+srv://admin:<password>@cluster0.lbbke.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', {
    auth: {
      user: "admin",
      password: "pass"
    },
    useNewUrlParser:true,
    useUnifiedTopology: true
      }).then(
        () => { 
            console.log("MongoAtlas Database connected.");
        },
        err => { 
            /** handle initial connection error */ 
            console.log("Error in database connection. ", err);
        }
    );


// mongoose.connect('mongodb://localhost/bizquesta', {useNewUrlParser: true, useUnifiedTopology: true});
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:true}));
mongoose.set('useFindAndModify', false);

var userSchema = new mongoose.Schema({
    username: String,
    password: String,
    type: String,
    name: String, 
    phone: String,
    email: String,
    introducerreference: String,
    userreference: String,
});

userSchema.plugin(passportLocalMongoose);

var User = mongoose.model("User", userSchema);

var contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String
});

var Contact = mongoose.model("Contact", contactSchema);

//PASSPORT CONFIG
app.use(require('express-session')({
    secret: "I can do it!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(flash());


app.use(function(req,res,next){   
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});


isAdmin = function(req,res,next){
    if(req.user.type == 0){
        return next();
    }
    req.flash("error", "You need to be logged in from a admin account to do that!");
    res.redirect("/login");
}

isLoggedIn = function(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "Please Login first!");
    res.redirect("/login");
}

app.get('/', function(req, res){
   res.render("home.ejs");
})

app.get('/login', function(req, res){
    res.render("login.ejs");
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true
}), function(req,res){
});

app.get("/logout", function(req, res){
    req.logOut();
    req.flash("success", "Successfully logged out!");
    res.redirect("/login");
});

app.get('/signup', function(req, res){
    res.render("signup.ejs");
})


app.post("/signup", function(req, res){
    var reference = uuidv4();
    var user = {
                username: req.body.username, 
                type: req.body.type,
                name: req.body.name,
                phone: req.body.phone,
                email: req.body.email,
                address: req.body.address,
                introducerreference: req.body.introducerreference,
                userreference: reference,
                };
                
    User.register(new User(user), req.body.password, function(err, user){
        if(err){
            req.flash("error", err.message);
            res.redirect("/login");
        }
        passport.authenticate("local")(req,res, function(){
            res.redirect("/payment");
        });    
    });
})

app.get("/dashboard", isLoggedIn, function(req, res){
    User.find({}, function(err, users){
        if(err){
            res.send("Something went wrong!");
            console.log(err);
        } else {
            res.render("dash.ejs", {users: users});
        }
    })
});

app.get("/product", function(req, res){
    res.render("product-page.ejs");
});

app.get("/payment", function(req, res){
    res.render("payment.ejs");
});

app.get('/admin-dashboard', isLoggedIn, isAdmin, function(req, res){
    User.find({}, function(err, users){
        if(err){
            res.send("Something went wrong!");
            console.log(err);
        } else {
            res.render('admin-dashboard.ejs', {users: users});
        }
    })
});

app.get('/learn', isLoggedIn, function(req, res){
    res.render("learn.ejs");
});

app.post('/contact', function(req, res){
    var details = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone
    }

    Contact.create(details, function(err, contact){
        if(err){
            res.send("Something went Wrong!");
            console.log(err);
        } else {
            res.redirect('/');
        }
    });
});

app.post('/search', function(req, res){
    var input = req.body.input;
    User.find({}, function(err, users){
        if(err){
            res.send("Something went wrong!");
            console.log(err)
        } else {
            res.render("search.ejs", {users: users, input: input});
        }
    });
});

app.get("/contacts", function(req, res){
    Contact.find({}, function(err, contact){
        if(err){
            res.send("Something went Wrong!");
            console.log(err);
        } else {
            res.render("contacts.ejs", {contact: contact});
        }
    });
});

app.get("/users/:id", isAdmin, isLoggedIn, function(req, res){
    User.findByIdAndRemove(req.params.id, function(err, user){
        if(err){
            res.send("Something went Wrong!");
        } else {
            req.flash("success", "User removed successfully!");
            res.redirect("/admin-dashboard");
        }
    });
});

app.listen(process.env.PORT || 3000, function(){
    console.log("Bizquesta server started...");
});