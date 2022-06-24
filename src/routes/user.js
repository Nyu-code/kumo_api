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
  mkdirp('../rep_User/' + user.username)
	const hash = bcrypt.hashSync(user.password, saltRounds)
  openpgp.generateKey(pgp_config).then(({privateKey, publicKey}) => {
    // console.log(publicKey)
    // console.log(privateKey)
    sequelize.query("INSERT INTO users (username, email, password, public_key, private_key) VALUES (?, ?, ?, ?, ?)",{
      replacements: [user.username, user.email, hash, publicKey, privateKey]
    }).then(([results, metadata]) => {
      sequelize.query("SELECT user_id FROM users WHERE email = '" + user.email + "';")
      .then(([results, metadata]) => {
        res.json(true);
      })
    })
  }).catch((err) => {
    console.log(err);
  })
}

const login = (req, res) => {
	const email = req.body.email
	const empty = ''
	const password = req.body.password

	sequelize.query("SELECT user_id, username, password FROM users WHERE email = '" + email + "'")
	.then(([results, metadata]) => {
		const user = {
			email: req.body.email,
		}
		if(results != empty) {
			hashedPassword = results[0].password
			bcrypt.compare(password, hashedPassword, function(err, same){
				if(err) {
					res.json(false)
					return;
				} else {
					if (same) {
						req.session.id_user = results[0].iduser
						const {token, refreshToken} = generateToken(user)
						res.json({token: token, refreshToken: refreshToken})
						return;
					} else {
						res.json(false)
						return;
					}
				}
			})
		} else {
			res.json(false)
			return;
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
  sequelize.query("SELECT username FROM users WHERE user_id = " + req.session.userId)
  .then(([results, metadata]) => {
    res.json(results)
  })
}

module.exports = {getUser, login, logoutTo, register}