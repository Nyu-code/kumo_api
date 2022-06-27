const uuid = require('uuid').v4
const openpgp = require('openpgp')
const fs = require('fs')

const addFile = (req, res) => {
  const title = req.body.title
  const file = req.file
  if (!file)
    return res.status(400).json("Error: no file submited")

  console.log(file)
  pgp_key_gen(file)
  return res.status(200).json({message: 'File successfully uploaded'})
  
}

async function pgp_key_gen(file){

  const pgp_config = {
    type: 'rsa',
    rsaBits: 2048, // RSA key size (defaults to 4096 bits)
    userIDs: [{ name: file.filename, email: file.filename + "@efrei.net" }], // you can pass multiple user IDs
  }
  const {privateKey, publicKey} = await openpgp.generateKey(pgp_config)
    encrypt_key(publicKey, file)
    return publicKey
  }


async function encrypt_key(publicKey, file){
  const openpgpPublicKey = await openpgp.readKey({ armoredKey: publicKey})
  const fileRead = fs.readFileSync('uploads/' + file.filename)
  const fileForPgp = new Uint8Array(fileRead)
  
  const options = {
    message: await openpgp.createMessage({binary: fileForPgp}),
    encryptionKeys: openpgpPublicKey,
    //format: 'binary'
  }
  const encrypt_rep = await openpgp.encrypt(options)
  //const encryptedFile = encrypt_rep.message.packets.write();
  fs.writeFileSync('uploads/' + "enc_" + file.filename, encrypt_rep)
  fs.unlinkSync('uploads/' + file.filename)
  /*
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
  */
}

module.exports = {addFile}