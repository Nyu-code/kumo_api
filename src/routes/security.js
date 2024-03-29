const jwt = require('jsonwebtoken')

const generateToken = (user) => {
  const token = jwt.sign({user: user}, process.env.TOKEN_SECRET, {expiresIn: process.env.TOKEN_EXPIRE_TIME})
  const refreshToken = jwt.sign(user, process.env.TOKEN_SECRET)
  return {token, refreshToken}
}

const validateToken = (req, res) => {
  const token = req.body.token
  if (!token) return res.status(403).json({message: "Error: you need to provide a token in the body"})
  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(403).json({message: "Error: Invalid token"})
    }
    decoded.user.token = token
    return res.json(decoded.user)
  })
}

const verifyToken = (req, res, next) => {
  const bearerHeader = req.headers['authorization']
  if(bearerHeader) {
    const token = bearerHeader.split(' ')[1]
    jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
      if (err)
        return res.status(403).json({message: "Error: invalid token"})
      req.user = decoded.user
      next()
    })
  } else {
    return res.status(403).json({message: "Error: a token is required to access this route"})
  }
}

const getToken = (req,res) => {
  const refreshToken = req.body.token
  if(refreshToken == null)
    return res.sendStatus(401)
  if(!refreshTokens.includes(refreshToken))
    return res.sendStatus(403)
  jwt.verify(refreshToken, process.env.TOKEN_SECRET, (err, user) => {
    if(err) {
      return res.sendStatus(403)
    }
    const token = jwt.sign({user:user}, process.env.TOKEN_SECRET, {expiresIn: process.env.TOKEN_EXPIRE_TIME})
    res.json({token: token})
  }).catch((err) => {
    console.log(err);
    res.status(400).json({message: error.message})
  })
}

module.exports = {verifyToken, getToken, generateToken, validateToken}