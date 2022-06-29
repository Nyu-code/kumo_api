const openpgp = require('openpgp')
const fs = require('fs')
const sequelize = require('../database')

const sendFile = async (req, res) => {
  const file = req.file
  if (!file)
    return res.status(400).json("Error: no file submited")
  if (!Array.isArray(req.body.users) || req.body.users.length === 0)
    return res.status(400).json("Error: no user to send to specified")
  file.enc_path = `../users/${req.user.username}/${file.filename}`
  await pgp_key_gen(file)
  // encrypt_file(publicKey, file);
  // await db_add_file(file, req.user)
  for (let user of req.body.users)
    await encrypt_key_user(user, file)
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

const encrypt_file = async (publicKey, file) => {
  const openpgpPublicKey = await openpgp.readKey({ armoredKey: publicKey})
  const fileRead = fs.readFileSync('uploads/' + file.filename)
  const fileForPgp = new Uint8Array(fileRead)
  
  return new Promise(async () => {
    const options = {
      message: await openpgp.createMessage({binary: fileForPgp}),
      encryptionKeys: openpgpPublicKey,
    }
    const encrypt_rep = await openpgp.encrypt(options)
    fs.writeFileSync('uploads/' + "enc_" + file.filename, encrypt_rep)
    fs.unlinkSync('uploads/' + file.filename)
    resolve(true);
  })
}

const db_add_file = async (file, user) => {
  const sql = "Insert INTO files (filename, ref, sender_id, send_at, file_pb_key, file_pv_key, comment) VALUES (?, ?, ?, ?, ?, ?, ?)"
  // TODO encrypt private key with user public key
  const [results, metadata] = await sequelize.query(sql, {
    replacements: [file.originalname, file.enc_path, req.user.id, new Date(), file.publicKey, file.privateKey, "Rien pour l'instant"]
  });
}

const encrypt_key_user = async (user, file) => {
  const openpgpPublicKey = await openpgp.readKey({ armoredKey: user.publicKey})
  const options = {
    message: await openpgp.createMessage({text: file.privateKey}),
    encryptionKeys: openpgpPublicKey
  }
  const encrypt = await openpgp.encrypt(options)
  console.log(encrypt);
}

module.exports = {sendFile}