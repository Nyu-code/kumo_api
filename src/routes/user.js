const bcrypt = require('bcrypt')
const openpgp = require('openpgp')
const mkdirp = require("mkdirp")

const sequelize = require('../database')
const { generateToken } = require('./security')


const register = (req, res) => {
  const saltRounds = 10
  const user = {
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
  }
  const pgp_config = {
    type: 'rsa',
    rsaBits: 2048, // RSA key size (defaults to 4096 bits)
    userIDs: [{ name: user.username, email: user.email }], // you can pass multiple user IDs
    passphrase: user.password // protects the private key
  }
  sequelize.query("SELECT user_id FROM users WHERE email = ?", {replacements: [user.email]}).then(([results, metadata]) => {
    if (results.length != 0)
      return res.status(400).json({message: "Error, this email address is already used"})
    mkdirp('../rep_User/' + user.username)
    const hash = bcrypt.hashSync(user.password, saltRounds)
    openpgp.generateKey(pgp_config).then(({privateKey, publicKey}) => {
      sequelize.query("INSERT INTO users (username, email, password, public_key, private_key) VALUES (?, ?, ?, ?, ?)", {
        replacements: [user.username, user.email, hash, publicKey, privateKey]
      }).then(([results, metadata]) => {
        user.id = results;
        return res.json(user)
      })
    })
  }).catch((err) => {
    console.log(err)
    return res.status(400).json({message: err.message})
  })
  
}

const login = (req, res) => {
  const user = {
    email: req.body.email,
  }
  if (!user.email || !req.body.password)
    return res.status(400).json({message: "Error: need an email and a password to log in"})
  sequelize.query('SELECT * FROM users WHERE email = ?', {
    replacements: [user.email]
  }).then(([results, metadata]) => {
    if(results.length === 1) {
      hashedPassword = results[0].password
      bcrypt.compare(req.body.password, hashedPassword, function(err, same){
        if(err) {
          throw new Error(err);
        } else {
          if (same) {
            user.id = results[0].user_id
            user.username = results[0].username
            const {token, refreshToken} = generateToken(user)
            user.token = token
            user.refreshToken = refreshToken
            req.session.user = user
            return res.status(200).json(user)
          } else {
            return res.status(400).json({message: "Error: invalid credentials"})
          }
        }
      })
    } else {
      return res.status(400).json({message: 'Error: user does not exists'})
    }
  }).catch ((err) => {
    console.log(err)
    return res.status(400).json({message: err.message})
  })
}

const logoutTo = (req,res) => {
  refreshTokens = refreshTokens.filter(token => token !== req.body.token)
  res.sendStatus(204)
}

const getUser = (req, res) => {
  console.log(req.body);
	const userId = req.body.userId
  sequelize.query("SELECT user_id, public_key FROM users WHERE user_id = " + userId)
  .then(([results, metadata]) => {
    res.json(results)
  })
}

module.exports = {getUser, login, logoutTo, register}