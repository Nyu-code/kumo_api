const multer = require('multer')
const fs = require('fs')
const path = require('path')
const uuid = require('uuid').v4

TMP_DIR = path.join(__dirname, '../../tmp')
console.log(TMP_DIR)

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR)

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