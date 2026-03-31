const Sequelize = require('sequelize');

const sequelize = new Sequelize('rfpwttrx', 'rfpwttrx', 'BL0jR9AhNK73as74De5Ab2sbjjJv3tnv', {
  host: 'suleiman.db.elephantsql.com',
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
      ssl: { rejectUnauthorized: false }
  },
  query: { raw: true },
  pool: { max: 10, min: 0, idle: 10000 }
});

// Define models
const Student = sequelize.define('Student', {
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
  program: Sequelize.STRING
});

const Program = sequelize.define('Program', {
  programCode: { type: Sequelize.STRING, primaryKey: true },
  programName: Sequelize.STRING
});

// Define relationships
Program.hasMany(Student, { foreignKey: 'program' });
Student.belongsTo(Program, { foreignKey: 'program' });

// Initialize database
function initialize() {
  return sequelize.sync()
    .then(() => console.log('Database synced'))
    .catch((err) => Promise.reject('Unable to sync the database: ' + err));
}

// Students
function getAllStudents() { return Student.findAll(); }

function getStudentsByStatus(status) {
  return Student.findAll({ where: { status } });
}

function getStudentsByProgramCode(program) {
  return Student.findAll({ where: { program } });
}

function getStudentsByExpectedCredential(credential) {
  return Student.findAll({ where: { expectedCredential: credential } });
}

function getStudentById(studentID) {
  return Student.findByPk(studentID);
}

function addStudent(studentData) {
  studentData.isInternationalStudent = !!studentData.isInternationalStudent;
  for (let key in studentData) {
    if (studentData[key] === "") studentData[key] = null;
  }
  return Student.create(studentData);
}

function updateStudent(studentData) {
  studentData.isInternationalStudent = !!studentData.isInternationalStudent;
  for (let key in studentData) {
    if (studentData[key] === "") studentData[key] = null;
  }
  return Student.update(studentData, { where: { studentID: studentData.studentID } });
}

function deleteStudentById(studentID) {
  return Student.destroy({ where: { studentID } });
}

// Programs
function getPrograms() { return Program.findAll(); }

function getProgramByCode(programCode) {
  return Program.findByPk(programCode);
}

function addProgram(programData) {
  for (let key in programData) {
    if (programData[key] === "") programData[key] = null;
  }
  return Program.create(programData);
}

function updateProgram(programData) {
  for (let key in programData) {
    if (programData[key] === "") programData[key] = null;
  }
  return Program.update(programData, { where: { programCode: programData.programCode } });
}

function deleteProgramByCode(programCode) {
  return Program.destroy({ where: { programCode } });
}

// Export
module.exports = {
  initialize,
  getAllStudents,
  getStudentsByStatus,
  getStudentsByProgramCode,
  getStudentsByExpectedCredential,
  getStudentById,
  addStudent,
  updateStudent,
  deleteStudentById,
  getPrograms,
  getProgramByCode,
  addProgram,
  updateProgram,
  deleteProgramByCode
};