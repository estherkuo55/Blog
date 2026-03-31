var express = require("express");
var app = express();
const path = require("path");
const multer = require("multer");
const exphbs = require("express-handlebars");
const clientSessions = require('client-sessions');


const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

var HTTP_PORT = process.env.PORT || 8080;

//Express built-in "bodyParser" - to access form data in http body
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.use(clientSessions({
  cookieName: "session", // Name of the session cookie
  secret: "secret_key", // Secret key for the session cookie
  duration: 30 * 60 * 1000, // Session duration in milliseconds
  activeDuration: 5 * 60 * 1000, // Session active duration in milliseconds
}));

// Import the data-service module
const dataService = require("./data-service");
const dataServiceAuth = require('./data-service-auth');
const { MulterError } = require("multer");

//Set the cloudinary config 
cloudinary.config({
  cloud_name: 'dy49xpi4m',
  api_key: '238756957843678',
  api_secret: '11uWQqTWM8viZalijqfl7cRzpKE',
  secure: true
});

//"upload" variable without any disk storage
const upload = multer(); 

//built-in "express.urlencoded" middleware 
app.use(express.urlencoded({ extended: true }));

app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

// call this function after the http server starts listening for requests
function onHttpStart() {
console.log("\n****Express http server listening on: " + HTTP_PORT + "****\n\n\n\n");
}

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
}


//use the new "express-handlebars" module
app.engine('.hbs', exphbs.engine({extname: 'hbs'}));

app.set('view engine', '.hbs');

app.engine('.hbs', exphbs.engine({
  extname: '.hbs',

  helpers:{
    navLink: function(url, options){
      return '<li' + 
          ((url == app.locals.activeRoute) ? ' class="active" ' : '') + 
          '><a href="' + url + '">' + options.fn(this) + '</a></li>';
    },
    equal: function (lvalue, rvalue, options) {
      if (arguments.length < 3)
          throw new Error("Handlebars Helper equal needs 2 parameters");
      if (lvalue != rvalue) {
          return options.inverse(this);
      } else {
          return options.fn(this);
      }
    }
  }
}));

// setup a 'route' to listen on the default url path (http://localhost)
app.get('/', (req, res) => {
  res.render('home');
});


// setup another route to listen on /about
app.get('/about', (req, res) => {
  res.render('about');
});

// Post
// Add route for students/add
app.get('/students/add', ensureLogin, (req, res) => {
  dataService.getPrograms()
  .then((data) => {
    res.render('addStudent', { programs: data });
  })
  .catch((err) => {
    // Render the students view with an error message
    res.render("addStudent", { message: err.message });
  });
});
  
app.get('/students', ensureLogin, (req, res) => {
  const status = req.query.status;
  const program = req.query.program;
  const credential = req.query.credential;

  if (status) {
    dataService.getStudentsByStatus(status)
      .then((students) => {
        res.render('students', { students });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Error retrieving students");
      });
  } else if (program) {
    dataService.getStudentsByProgramCode(program)
      .then((students) => {
        res.render('students', { students });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Error retrieving students");
      });
  } else if (credential) {
    dataService.getStudentsByExpectedCredential(credential)
      .then((students) => {
        res.render('students', { students });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Error retrieving students");
      });
  } else {
    dataService.getAllStudents()
      .then((students) => {
        res.render('students', { students });
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Error retrieving students");
      });
  }
});


app.get("/students/delete/:studentID", ensureLogin, (req, res)=>
{
  const studentID = req.params.studentID
  dataService.deleteStudentById(studentID)
  .then(() => 
  {
    console.log("Student deleted");
    res.redirect("/students");
  })
  .catch((err) => 
  {
    console.log(err)
    res.status(500).send("Fail to Remove Student");
  });

})

app.post("/student/update", ensureLogin, (req, res) => 
{
  console.log(req.body.studentID);
  dataService.updateStudent(req.body)
    .then(() => 
    {
      res.redirect("/students");
    }).catch((error) => 
    {
      console.error(error);
      res.send(error);
    });
});

app.post("/students/add", ensureLogin, function(req, res) {
  dataService.addStudent(req.body)
    .then(() => {
      console.log("Student added");
      res.redirect('/students');
    })
    .catch((err) => {
      res.status(500).send("Unable to add student");
    });
});

app.get("/student/:studentID", ensureLogin, (req, res) => {

  // initialize an empty object to store the values
  let viewData = {};

  dataService.getStudentById(req.params.studentID).then((data) => {
      if (data) {
          viewData.student = data; //store student data in the "viewData" object as "student"
      } else {
          viewData.student = null; // set student to null if none were returned
      }
  }).catch(() => {
      viewData.student = null; // set student to null if there was an error 
  }).then(dataService.getPrograms)
  .then((data) => {
      viewData.programs = data; // store program data in the "viewData" object as "programs"

      // loop through viewData.programs and once we have found the programCode that matches
      // the student's "program" value, add a "selected" property to the matching 
      // viewData.programs object

      for (let i = 0; i < viewData.programs.length; i++) {
          if (viewData.programs[i].programCode == viewData.student.program) {
              viewData.programs[i].selected = true;
          }
      }

  }).catch(() => {
      viewData.programs = []; // set programs to empty if there was an error
  }).then(() => {
      if (viewData.student == null) { // if no student - return an error
          res.status(404).send("Student Not Found");
      } else {
          res.render("student", { viewData: viewData }); // render the "student" view
      }
  }).catch((err)=>{
      res.status(500).send("Unable to Show Students");
    });
});

// Category
app.get("/programs/add", ensureLogin, (req, res) => {
  res.render('addProgram');
})

app.get("/programs", ensureLogin, (req, res) => {
  dataService.getPrograms()
  .then((data) => {
    // console.log("get program", programs)
    if (data.length > 0) {
    res.render("programs", { programs: data });
    } else {
    res.render("programs", { message: "No results found." });
    }
    })
    .catch((error) => {
      console.error(error);
      res.render("programs", { message: "An error occurred." });
    });
});

app.get('/program/:programCode', ensureLogin, (req, res) => {
  const programCode = req.params.programCode;

  dataService.getProgramByCode(programCode)
    .then((data) => {
      if (data) {
        res.render('program', { program: data});
      } else {
        res.status(404).send("Program Not Found");
      }
    })
    .catch(() => {
      res.status(404).send("Program Not Found");
    });
});

app.get("/programs/delete/:programCode", ensureLogin, (req, res) => 
{
  dataService.deleteProgramByCode(req.params.programCode)
    .then(() => 
    {
      console.log("Program deleted");
      res.redirect("/programs");
    })
    .catch((err) => 
    {
      console.log(err + '\n\n')
      res.status(500).send("Fail to Remove Program");
    });
});

app.post("/program/update", ensureLogin, (req, res) => {
  dataService.updateProgram(req.body)
  .then(() => {
    res.redirect("/programs")
  })
  .catch((error) => {
    console.error(error);
    res.send(error);
  });
});

app.post('/programs/add', ensureLogin, function(req, res) {
  dataService.addProgram(req.body)
  .then(() => {
    console.log("Program added");
    res.redirect('/programs');
  })
  .catch((err) => {
    res.status(500).send('unable to add program');
  });
})


//USER AUTH
app.get('/login', (req, res) => {
  res.render('login', {});
});

app.post('/login', (req, res) => {
  req.body.userAgent = req.get('User-Agent');

  dataServiceAuth.checkUser(req.body)
    .then((user) => {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory,
      };

      res.redirect('/students');
    })
    .catch((err) => {
      res.render('login', { errorMessage: err, userName: req.body.userName });
    });
});

app.get('/register', (req, res) => {
  res.render('register', {});
});

app.post('/register', (req, res) => {
  dataServiceAuth.registerUser(req.body)
    .then(() => {
      res.render('register', { successMessage: 'User created' });
    })
    .catch((err) => {
      res.render('register', { errorMessage: err, userName: req.body.userName });
    });
});

app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory', {});
});


app.use(function(req, res, next){
  let route = req.baseUrl + req.path;
  app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");
  next();
});

app.use((req, res) =>
 {
    res.status(404).send("<h2>404</h2><p>Page Not Found</p>");
});

// setup http server to listen on HTTP_PORT
dataService.initialize()
    .then(() => {
        return dataServiceAuth.initialize();
    })
    .then(() => {
      app.listen(HTTP_PORT, onHttpStart );
    })
    .catch((err) => {
        console.log(`unable to start server: ${err}`);
    });