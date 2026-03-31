const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const exphbs = require("express-handlebars");
const clientSessions = require('client-sessions');
const cloudinary = require('cloudinary').v2;

const dataService = require("./data-service");

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

// Handlebars
app.engine('.hbs', exphbs.engine({
  extname: '.hbs',
  helpers: {
    navLink: function(url, options) {
      return '<li' + ((url == app.locals.activeRoute) ? ' class="active" ' : '') +
        '><a href="' + url + '">' + options.fn(this) + '</a></li>';
    },
    equal: function(lvalue, rvalue, options) {
      if (arguments.length < 3) throw new Error("Need 2 params");
      return (lvalue != rvalue) ? options.inverse(this) : options.fn(this);
    }
  }
}));
app.set("view engine", ".hbs");


cloudinary.config({
  cloud_name: 'dy49xpi4m',
  api_key: '238756957843678',
  api_secret: '11uWQqTWM8viZalijqfl7cRzpKE',
  secure: true
});

const upload = multer();

// Active route
app.use((req, res, next) => {
  let route = req.baseUrl + req.path;
  app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");
  next();
});


function ensureLogin(req, res, next) {
  if (!req.session.user) res.redirect("/login");
  else next();
}


app.get("/", (req, res) => res.render("home"));
app.get("/about", (req, res) => res.render("about"));


app.get("/login", (req, res) => res.render("login"));

app.post("/login", (req, res) => {
  // 不用 MongoDB，直接登入
  req.session.user = {
    userName: req.body.userName || "testUser",
    email: "test@test.com",
    loginHistory: []
  };
  res.redirect("/students");
});

app.get("/register", (req, res) => res.render("register"));

app.post("/register", (req, res) => {
  res.render("register", { successMessage: "Register disabled (no DB)" });
});

app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect("/");
});

app.get("/userHistory", ensureLogin, (req, res) => res.render("userHistory"));


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
  } catch {
    res.status(500).send("Error retrieving students");
  }
});

app.get("/students/delete/:studentID", ensureLogin, async (req, res) => {
  await dataService.deleteStudentById(req.params.studentID);
  res.redirect("/students");
});

app.post("/students/add", ensureLogin, async (req, res) => {
  await dataService.addStudent(req.body);
  res.redirect("/students");
});

app.post("/student/update", ensureLogin, async (req, res) => {
  await dataService.updateStudent(req.body);
  res.redirect("/students");
});

app.get("/student/:studentID", ensureLogin, async (req, res) => {
  let viewData = {};
  const student = await dataService.getStudentById(req.params.studentID);
  const programs = await dataService.getPrograms();

  viewData.student = student;
  viewData.programs = programs.map(p => ({
    ...p,
    selected: p.programCode === student.program
  }));

  res.render("student", { viewData });
});


app.get("/programs", ensureLogin, async (req, res) => {
  const programs = await dataService.getPrograms();
  res.render("programs", { programs });
});

app.get("/programs/add", ensureLogin, (req, res) => res.render("addProgram"));

app.get("/program/:programCode", ensureLogin, async (req, res) => {
  const program = await dataService.getProgramByCode(req.params.programCode);
  res.render("program", { program });
});

app.post("/programs/add", ensureLogin, async (req, res) => {
  await dataService.addProgram(req.body);
  res.redirect("/programs");
});

app.post("/program/update", ensureLogin, async (req, res) => {
  await dataService.updateProgram(req.body);
  res.redirect("/programs");
});

app.get("/programs/delete/:programCode", ensureLogin, async (req, res) => {
  await dataService.deleteProgramByCode(req.params.programCode);
  res.redirect("/programs");
});


app.use((req, res) => {
  res.status(404).send("<h2>404</h2><p>Page Not Found</p>");
});


dataService.initialize()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`Server listening on port ${HTTP_PORT}`);
    });
  })
  .catch(err => {
    console.log("Unable to start server:", err);
  });