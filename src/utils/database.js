const { Sequelize } = require('sequelize')

const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PSSWD, {
  dialect: process.env.DB_DIALECT,
  host: process.env.DB_HOST,
})

sequelize.authenticate().then(() => {
  console.log("Connecté à la base de donnée mysql !");
}).catch((err) => {
  console.error("Impossible de se connecter, erreur suivante : ", err);
})

module.exports = sequelize