const bcrypt = require('bcrypt')
const openpgp = require('openpgp')

const sequelize = require('../utils/database')
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

const getUsers = (req,res) => {
  sequelize.query('SELECT user_id, username, email FROM users').then(([results, metadata])=>{
    res.json(results)
  }).catch((err) => {
    console.log(err)
    res.status(400).json({message: err.message})
  })
}

const getSendFiles = (req, res) => {
  sequelize.query("SELECT file_id, filename, send_at, comment FROM files WHERE sender_id = ? ORDER BY send_at DESC", {
    replacements: [req.user.id]
  }).then(([files_results, files_meta]) => {
    if (files_results.length === 0)
      return res.json([])
    const files_id = files_results.map((file_info) => {
      return file_info.file_id
    })
    sequelize.query("SELECT uf.user_id, username, email, file_id FROM user_file uf JOIN users u ON uf.user_id = u.user_id WHERE uf.file_id IN(?)", {
      replacements: [files_id]
    }).then(([users_results, users_meta]) => {
      for (let file of files_results) {
        file.send_to = users_results.filter((user) => user.file_id === file.file_id)
      }
      res.status(200).json(files_results)
    })
  }).catch((err) => {
    console.log(err)
    return res.json({message: "Error: database error"})
  })
}

const getReceivedFiles = (req, res) => {
  sequelize.query("SELECT uf.file_id, filename, sender_id, send_at, comment, username, email FROM user_file uf JOIN files f ON uf.file_id = f.file_id JOIN users u ON f.sender_id = u.user_id WHERE uf.user_id = ?", {
    replacements: [req.user.id]
  }).then(([results, metadata]) => {
    return res.status(200).json(results)
  }).catch((err) => {
    console.log(err)
    return res.status(400).json({message: "Error: database error"})
  })
}

const deleteFile = (req, res) => {
  const file_id = req.params.file_id
  if (!file_id)
    return res.status(400).json({message: 'Error: you need to provide a valid file id'})
  sequelize.query('DELETE FROM files WHERE file_id = ? AND sender_id = ?', {
    replacements: [file_id, req.user.id]
  }).then(([results, metadata]) => {
    if (results.affectedRows === 0)
      return res.status(404).json({message: 'Error: this file does not exists or does not belong to you'})
    return res.json({message: 'File deleted'})
  }).catch((err) => {
    console.log(err)
    return res.status(400).json({message: 'Error: database error'})
  })
}

const deleteUserAccess = (req, res) => {
  const file_id = req.body.file_id
  const user_id = req.body.user_id
  if (!file_id || !user_id)
    return res.status(400).json({message: 'Error: you need to provide a user and a file'})
  sequelize.query('DELETE FROM user_file WHERE file_id = ? AND user_id = ? AND (SELECT COUNT(*) FROM files WHERE sender_id = ? AND file_id = ?) = 1', {
    replacements: [file_id, user_id, req.user.id, file_id]
  }).then(([results, metadata]) => {
    if (results.affectedRows === 0)
      return res.status(404).json({message: "Error: the user does not exists or he doesn't have access to this file"})
    return res.json({message: 'User access supressed'})
  }).catch((err) => {
    console.log(err)
    return res.status(400).json({message :'Error: database error'})
  })
}

module.exports = {login, logoutTo, register, getUsers, getSendFiles, getReceivedFiles, deleteFile, deleteUserAccess}
