const Sequelize = require('sequelize');

// 建立 Sequelize 實例
var sequelize = new Sequelize('blog_a1mm', 'blog_a1mm_user', 'AmQTMJd6YtgyHnf79vvKmV9puMwZGhCe', {
  host: 'dpg-d75n61p4tr6s73cagi80-a',
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
      ssl: { rejectUnauthorized: false } // 保持 SSL
  },
  query: { raw: true },
  pool: {
      max: 10,
      min: 0,
      idle: 10000
  },
  logging: console.log // 開啟 SQL logging，部署時方便看
});

// 定義 Student model
var Student = sequelize.define('Student',{
  studentID: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  firstName: Sequelize.STRING,
  lastName: Sequelize.STRING,
  email: Sequelize.STRING,
  phone: Sequelize.STRING,
  addressStreet: Sequelize.STRING,
  addressCity: Sequelize.STRING,
  addressState: Sequelize.STRING,
  addressPostal: Sequelize.STRING,
  isInternationalStudent: Sequelize.BOOLEAN,
  expectedCredential: Sequelize.STRING,
  status: Sequelize.STRING,
  registrationDate: Sequelize.STRING,
  program: Sequelize.STRING // foreign key 對應 Program
});

// 定義 Program model
var Program = sequelize.define('Program', {
  programCode: { type: Sequelize.STRING, primaryKey: true },
  programName: Sequelize.STRING
});

// 關聯
Program.hasMany(Student, { foreignKey: 'program' });

// 初始化資料庫
function initialize() {
  return sequelize.authenticate()
    .then(() => {
      console.log("Database connected successfully.");
      return sequelize.sync(); // 只 sync 一次
    })
    .catch((err) => {
      console.error("Unable to connect or sync the database:", err);
      throw new Error("Unable to sync the database");
    });
}

// ---------------------- CRUD Function ---------------------- //

function getAllStudents() {
  return Student.findAll()
    .catch(() => { throw new Error("No results returned"); });
}

function getPrograms() {
  return Program.findAll()
    .catch(() => { throw new Error("No results returned"); });
}

function getStudentsByStatus(status) {
  return Student.findAll({ where: { status } })
    .catch(() => { throw new Error("No results returned"); });
}

function getStudentsByProgramCode(program) {
  return Student.findAll({ where: { program } })
    .catch((err) => { throw err; });
}

function getStudentsByExpectedCredential(credential) {
  return Student.findAll({ where: { expectedCredential: credential } })
    .catch((err) => { throw err; });
}

function getStudentById(sid) {
  return Student.findByPk(sid)
    .then((data) => data || null)
    .catch((err) => { throw new Error("Student not found: " + err); });
}

function addStudent(studentData) {
  studentData.isInternationalStudent = !!studentData.isInternationalStudent;
  for (let key in studentData) {
    if (studentData[key] === "") studentData[key] = null;
  }
  return Student.create(studentData)
    .catch(() => { throw new Error("Unable to create student"); });
}

function updateStudent(studentData) {
  studentData.isInternationalStudent = !!studentData.isInternationalStudent;
  for (let key in studentData) {
    if (studentData[key] === "") studentData[key] = null;
  }
  return Student.update(studentData, { where: { studentID: studentData.studentID } })
    .catch((err) => { throw new Error("Unable to update student: " + err); });
}

function deleteStudentById(id) {
  return Student.destroy({ where: { studentID: id } })
    .catch((err) => { throw new Error("Fail to delete student: " + err); });
}

function addProgram(programData) {
  for (let key in programData) {
    if (programData[key] === "") programData[key] = null;
  }
  return Program.create(programData)
    .catch((err) => { throw new Error("Unable to create program: " + err); });
}

function updateProgram(programData) {
  for (let key in programData) {
    if (programData[key] === "") programData[key] = null;
  }
  return Program.update(programData, { where: { programCode: programData.programCode } })
    .catch((err) => { throw new Error("Unable to update program: " + err); });
}

function getProgramByCode(pcode) {
  return Program.findByPk(pcode)
    .then((data) => data || null)
    .catch((err) => { throw err; });
}

function deleteProgramByCode(pcode) {
  return Program.destroy({ where: { programCode: pcode } })
    .catch((err) => { throw new Error("Fail to delete program: " + err); });
}

// ---------------------- Export ---------------------- //
module.exports = {
  initialize,
  getAllStudents,
  getPrograms,
  addStudent,
  getStudentsByStatus,
  getStudentsByProgramCode,
  getStudentsByExpectedCredential,
  getStudentById,
  updateStudent,
  addProgram,
  updateProgram,
  getProgramByCode,
  deleteProgramByCode,
  deleteStudentById
};