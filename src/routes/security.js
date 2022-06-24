const jwt = require('jsonwebtoken')

const sequelize = require('../database')

let refreshTokens = []

const generateToken = (user) => {
  const token = jwt.sign({user: user}, "sdgsdgksfdngsgksd", {expiresIn:'1800s'})
  const refreshToken = jwt.sign(user, "jsdqngsdnjqsnsqdnvcjlznz63457435645")
  refreshTokens.push(refreshToken)
  return {token, refreshToken}
}

const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization']
  if(bearerHeader) {
    const bearerToken = bearerHeader.split(' ')[1]
    req.token = bearerToken
    next()
  } else {
    res.sendStatus(403)
  }
}

const getToken = (req,res) => {
  const refreshToken = req.body.token
  if(refreshToken == null)
    return res.sendStatus(401)
  if(!refreshTokens.includes(refreshToken))
    return res.sendStatus(403)
  jwt.verify(refreshToken, 'jsdqngsdnjqsnsqdnvcjlznz63457435645', (err, user) => {
    if(err) {
      return res.sendStatus(403)
    }
    const token = jwt.sign({user:user}, "sdgsdgksfdngsgksd", {expiresIn:'1800s'})
    res.json({token: token})
  }).catch((err) => {
    console.log(err);
    res.status(400).json({message: error.message})
  })
}

const checkAdmin = (req, res) => {
  sequelize.query("SELECT isAdmin FROM user, panier WHERE iduser = " + req.session.userId)
  .then(([results, metadata]) => {
    res.json(results)
  }).catch((err) => {
    console.log(err)
    res.status(400).json({message: err.message})
  })
}

module.exports = {verifyToken, getToken, checkAdmin, generateToken}