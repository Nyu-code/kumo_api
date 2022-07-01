const openpgp = require('openpgp')
const bcrypt = require('bcrypt')
const fs = require('fs')
const sequelize = require('../database')

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
    console.log(file_private_key)
    return res.status(200).json({message: "Done"})
  } catch(err) {
    console.log(err)
    return res.status(400).json({message: err.message})
  }
}

const decrypt_file_key = async (enc_key, armored_private_key, passphrase) => {
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: armored_private_key }),
    passphrase
  })

  const message = await openpgp.readMessage({
    armoredMessage: enc_key
  })

  const { data: decrypted } = await openpgp.decrypt({
    message,
    decryptionKeys: privateKey
  })

  return decrypted
}

const sendFile = async (req, res) => {
  const file = req.file
  if (!file)
    return res.status(400).json({message: "Error: no file submited"})
  let data
  try {
    data = JSON.parse(req.body.users);
  } catch (err) {
    return res.status(400).json({message: "Error: users not in JSON format"})
  }
  if (!Array.isArray(data) || data.length === 0)
    return res.status(400).json({message: "Error: no user to send to specified"})
  const users = data.filter((user) => typeof user === "number")
  file.enc_path = `../users/${req.user.username}/`
  console.log(file)
  await pgp_key_gen(file)
  encrypt_file(file)
  await db_add_file(file, req.user)
  const [users_info, metadata] = await sequelize.query("SELECT user_id, public_key FROM users WHERE user_id IN(:ids)", {
    replacements: {ids: users}
  })
  for (let user of users_info)
    encrypt_key_user(user, file)
  return res.status(200).json({message: 'File successfully uploaded'})
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
  const fileRead = fs.readFileSync(file.path)
  const fileForPgp = new Uint8Array(fileRead)
  
  return new Promise(async (resolve, reject) => {
    const options = {
      message: await openpgp.createMessage({binary: fileForPgp}),
      encryptionKeys: openpgpPublicKey,
      config: {preferredCompressionAlgorithm: openpgp.enums.compression.zlib}
    }
    const encrypt_rep = await openpgp.encrypt(options)
    if (!fs.existsSync(file.enc_path)) fs.mkdirSync(file.enc_path)
    fs.writeFileSync(file.enc_path + file.filename, encrypt_rep)
    fs.unlinkSync(file.path)
    resolve(true);
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
    replacements: [file.originalname, file.enc_path + file.filename, user.id, new Date(), file.publicKey, enc_private_key, "Rien pour l'instant"]
  });
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
  });
}

const decrypt_key_user = async (user, file) => {
  const openpgpPrivateKey = await openpgp.readKey({ armoredKey: privateKey})
  const fileReadPr = fs.readFileSync('uploads/' + file.originalname)
  const fileForPgpPr = new Uint8Array(fileRead)
  const optionspr = {
    decryptionKeys: openpgpPrivateKey,
    message: openpgp.readMessage(fileForPgpPr)
  }
  const decryptionResponse = await openpgp.decrypt(options)
  const decryptedFile = decryptionResponse.data
  fs.writeFileSync('uploads/' + file.originalname + "_denc", decryptedFile)
}

module.exports = {sendFile, download_file}