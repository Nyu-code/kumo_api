const express = require('express')
const router = express.Router()
const uuid = require('uuid').v4

const user = require('./routes/user')
const security = require('./routes/security')
const file = require('./routes/file')
const multer = require('multer')

router.post("/register", user.register)
router.post("/login", user.login)
router.post("/logoutTo", user.logoutTo)
router.post("/getUser", user.getUser)

router.post("/getToken", security.getToken)

const storage = multer.diskStorage({
    destination: (req, res, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, uuid());
    }
})
const upload = multer({storage})

router.post("/sendFile", [security.verifyToken, upload.single('file')], file.sendFile)

module.exports = router