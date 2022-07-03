const openpgp = require('openpgp')
const bcrypt = require('bcrypt')
const fs = require('fs')
const sequelize = require('../utils/database')
const path = require('path')
const uuid = require('uuid').v4

const download_file = async (req, res) => {
  try {
    if (!req.body.password) throw new Error("Error: need the password to download the file")
    const [userResult] = await sequelize.query("SELECT password, private_key from users WHERE user_id = ?", {replacements: [req.user.id]})
    if (!bcrypt.compareSync(req.body.password, userResult[0].password))
      return res.status(403).json({message: "Error wrong password"})
    const [fileResult] = await sequelize.query("SELECT * FROM user_file uf JOIN files f ON uf.file_id = f.file_id WHERE f.file_id = ? AND user_id = ?", {
      replacements: [req.params.file_id, req.user.id]
    })
    if (fileResult.length === 0) 
      return res.status(404).json({message: 'Error: file not found'})
    const enc_file = fileResult[0]
    const file_private_key = await decrypt_file_key(enc_file.enc_private_key, userResult[0].private_key, req.body.password)
    const file_stream = await decrypt_file(enc_file, file_private_key)
    res.attachment(enc_file.filename)
    file_stream.pipe(res)
  } catch(err) {
    console.log(err)
    return res.status(400).json({message: err.message})
  }
}

const decrypt_file = async (file_info, private_key_armored) => {
  const privateKey = await openpgp.readPrivateKey({ armoredKey: private_key_armored })
  const in_stream = fs.createReadStream(file_info.ref, 'utf-8')

  const message = await openpgp.readMessage({ armoredMessage: in_stream })
  const decrypted = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey
  })
  return decrypted.data
}

const decrypt_file_key = async (enc_key, armored_private_key, passphrase) => {
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: armored_private_key }),
    passphrase
  })
  const message = await openpgp.readMessage({ armoredMessage: enc_key })
  const decrypted = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey
  })
  return decrypted.data
}

const sendFile = async (req, res) => {
  try {
    const file = req.file
    if (!file)
      return res.status(400).json({message: "Error: no file submited"})
    const data = JSON.parse(req.body.users)
    if (!Array.isArray(data) || data.length === 0)
      return res.status(400).json({message: "Error: no destination user specified"})
    const users = data.filter((user) => typeof user === "number")
    file.enc_path = path.join(__dirname, "../../../users/" + req.user.username)
    await pgp_key_gen(file)
    encrypt_file(file)
    await db_add_file(file, req.user)
    const [users_info, metadata] = await sequelize.query("SELECT user_id, public_key FROM users WHERE user_id IN(:ids)", {
      replacements: {ids: users}
    })
    for (let user of users_info)
      encrypt_key_user(user, file)
    return res.status(200).json({message: 'File successfully uploaded'})
  } catch (err) {
    console.log(err)
    return res.status(500).json({message: err.message})
  }
  
}

const pgp_key_gen = async (file) => {
  const pgp_config = {
    type: 'rsa',
    rsaBits: 2048, // RSA key size (defaults to 4096 bits)
    userIDs: [{ name: file.filename }], // you can pass multiple user IDs
  }
  const {publicKey, privateKey} = await openpgp.generateKey(pgp_config)
  file.publicKey = publicKey
  file.privateKey = privateKey
}

const encrypt_file = async (file) => {
  const openpgpPublicKey = await openpgp.readKey({ armoredKey: file.publicKey })
  const in_stream = fs.createReadStream(file.path, 'utf-8')
  const out_stream = fs.createWriteStream(path.join(file.enc_path, file.filename))
  
  const options = {
    message: await openpgp.createMessage({ text: in_stream }),
    encryptionKeys: openpgpPublicKey,
    config: {preferredCompressionAlgorithm: openpgp.enums.compression.zlib},
  }
  const encrypt_rep = await openpgp.encrypt(options)
  if (!fs.existsSync(file.enc_path)) fs.mkdirSync(file.enc_path)
  encrypt_rep.pipe(out_stream)
  encrypt_rep.on('end', () => {
    fs.unlinkSync(file.path)
  })
}

const db_add_file = async (file, user) => {
  let [results, metadata] = await sequelize.query("SELECT public_key FROM users WHERE user_id = ?", {replacements: [user.id]})
  const openpgpPublicKey = await openpgp.readKey({ armoredKey: results[0].public_key})
  const options = {
    message: await openpgp.createMessage({text: file.privateKey}),
    encryptionKeys: openpgpPublicKey
  }
  const enc_private_key = await openpgp.encrypt(options);
  res = await sequelize.query("INSERT INTO files (filename, ref, sender_id, send_at, file_pb_key, file_pv_key, comment) VALUES (?, ?, ?, ?, ?, ?, ?)", {
    replacements: [file.originalname, path.join(file.enc_path, file.filename), user.id, new Date(), file.publicKey, enc_private_key, "Rien pour l'instant"]
  })
  file.id = res[0]
}

const encrypt_key_user = async (user, file) => {
  const openpgpPublicKey = await openpgp.readKey({ armoredKey: user.public_key})
  const options = {
    message: await openpgp.createMessage({text: file.privateKey}),
    encryptionKeys: openpgpPublicKey
  }
  const encrypt = await openpgp.encrypt(options)
  await sequelize.query('INSERT INTO user_file VALUES (?, ?, ?)', {
    replacements: [file.id, user.user_id, encrypt]
  })
}

module.exports = {sendFile, download_file}