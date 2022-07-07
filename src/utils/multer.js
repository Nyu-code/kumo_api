const multer = require('multer')
const fs = require('fs')
const path = require('path')
const uuid = require('uuid').v4

TMP_DIR = path.join(__dirname, '../../tmp')
USERS_DIR = path.join(__dirname, '../../../users')


if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR)
if (!fs.existsSync(USERS_DIR)) fs.mkdirSync(USERS_DIR)

const storage = multer.diskStorage({
  destination: (req, res, cb) => {
      cb(null, TMP_DIR)
  },
  filename: (req, file, cb) => {
      cb(null, uuid())
  }
})

const upload = multer({storage})

module.exports = upload