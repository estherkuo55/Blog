const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const exphbs = require("express-handlebars");
const clientSessions = require('client-sessions');
const cloudinary = require('cloudinary').v2;

const dataService = require("./data-service");
const dataServiceAuth = require("./data-service-auth");

const HTTP_PORT = process.env.PORT || 8080;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(clientSessions({
  cookieName: "session",
  secret: "secret_key",
  duration: 30 * 60 * 1000,
  activeDuration: 5 * 60 * 1000
}));

app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

// Handlebars setup
app.engine('.hbs', exphbs.engine({
  extname: '.hbs',
  helpers: {
    navLink: function(url, options) {
      return '<li' + ((url == app.locals.activeRoute) ? ' class="active" ' : '') + 
             '><a href="' + url + '">' + options.fn(this) + '</a></li>';
    },
    equal: function(lvalue, rvalue, options) {
      if (arguments.length < 3) throw new Error("Handlebars Helper equal needs 2 parameters");
      return (lvalue != rvalue) ? options.inverse(this) : options.fn(this);
    }
  }
}));
app.set("view engine", ".hbs");

// Cloudinary setup
cloudinary.config({
  cloud_name: 'dy49xpi4m',
  api_key: '238756957843678',
  api_secret: '11uWQqTWM8viZalijqfl7cRzpKE',
  secure: true
});
const upload = multer(); // memory storage

// Active route tracking
app.use((req, res, next) => {
  let route = req.baseUrl + req.path;
  app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");
  next();
});

// Auth helper
function ensureLogin(req, res, next) {
  if (!req.session.user) res.redirect("/login");
  else next();
}

// Routes
app.get("/", (req, res) => res.render("home"));
app.get("/about", (req, res) => res.render("about"));

// Students routes
app.get("/students/add", ensureLogin, async (req, res) => {
  try {
    const programs = await dataService.getPrograms();
    res.render("addStudent", { programs });
  } catch (err) {
    res.render("addStudent", { message: err });
  }
});

app.get("/students", ensureLogin, async (req, res) => {
  try {
    let students;
    const { status, program, credential } = req.query;
    if (status) students = await dataService.getStudentsByStatus(status);
    else if (program) students = await dataService.getStudentsByProgramCode(program);
    else if (credential) students = await dataService.getStudentsByExpectedCredential(credential);
    else students = await dataService.getAllStudents();
    res.render("students", { students });
  } catch (err) {
    res.status(500).send("Error retrieving students");
  }
});

app.get("/students/delete/:studentID", ensureLogin, async (req, res) => {
  try {
    await dataService.deleteStudentById(req.params.studentID);
    res.redirect("/students");
  } catch (err) {
    res.status(500).send("Fail to Remove Student");
  }
});

app.post("/students/add", ensureLogin, async (req, res) => {
  try {
    await dataService.addStudent(req.body);
    res.redirect("/students");
  } catch (err) {
    res.status(500).send("Unable to add student");
  }
});

app.post("/student/update", ensureLogin, async (req, res) => {
  try {
    await dataService.updateStudent(req.body);
    res.redirect("/students");
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/student/:studentID", ensureLogin, async (req, res) => {
  let viewData = {};
  try {
    const student = await dataService.getStudentById(req.params.studentID);
    if (!student) return res.status(404).send("Student Not Found");
    viewData.student = student;

    const programs = await dataService.getPrograms();
    viewData.programs = programs.map(p => ({
      ...p.dataValues,
      selected: p.programCode === student.program
    }));
    res.render("student", { viewData });
  } catch (err) {
    res.status(500).send("Unable to show student");
  }
});

// Programs routes
app.get("/programs", ensureLogin, async (req, res) => {
  try {
    const programs = await dataService.getPrograms();
    if (programs.length > 0) res.render("programs", { programs });
    else res.render("programs", { message: "No results found." });
  } catch (err) {
    res.render("programs", { message: "An error occurred." });
  }
});

app.get("/programs/add", ensureLogin, (req, res) => res.render("addProgram"));

app.get("/program/:programCode", ensureLogin, async (req, res) => {
  try {
    const program = await dataService.getProgramByCode(req.params.programCode);
    if (!program) return res.status(404).send("Program Not Found");
    res.render("program", { program });
  } catch (err) {
    res.status(404).send("Program Not Found");
  }
});

app.post("/programs/add", ensureLogin, async (req, res) => {
  try {
    await dataService.addProgram(req.body);
    res.redirect("/programs");
  } catch (err) {
    res.status(500).send("Unable to add program");
  }
});

app.post("/program/update", ensureLogin, async (req, res) => {
  try {
    await dataService.updateProgram(req.body);
    res.redirect("/programs");
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/programs/delete/:programCode", ensureLogin, async (req, res) => {
  try {
    await dataService.deleteProgramByCode(req.params.programCode);
    res.redirect("/programs");
  } catch (err) {
    res.status(500).send("Fail to Remove Program");
  }
});

// User Auth routes
app.get("/login", (req, res) => res.render("login"));
app.post("/login", async (req, res) => {
  try {
    req.body.userAgent = req.get("User-Agent");
    const user = await dataServiceAuth.checkUser(req.body);
    req.session.user = {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory
    };
    res.redirect("/students");
  } catch (err) {
    res.render("login", { errorMessage: err, userName: req.body.userName });
  }
});

app.get("/register", (req, res) => res.render("register"));
app.post("/register", async (req, res) => {
  try {
    await dataServiceAuth.registerUser(req.body);
    res.render("register", { successMessage: "User created" });
  } catch (err) {
    res.render("register", { errorMessage: err, userName: req.body.userName });
  }
});

app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect("/");
});

app.get("/userHistory", ensureLogin, (req, res) => res.render("userHistory"));

// 404 handler
app.use((req, res) => {
  res.status(404).send("<h2>404</h2><p>Page Not Found</p>");
});

// Start server
dataService.initialize()
  .then(() => dataServiceAuth.initialize())
  .then(() => {
    app.listen(HTTP_PORT, () => console.log(`Server listening on port ${HTTP_PORT}`));
  })
  .catch(err => {
    console.log("Unable to start server:", err);
  });