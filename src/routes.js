const express = require('express')
const router = express.Router()

const user = require('./routes/user')
const security = require('./routes/security')
const file = require('./routes/file')
const multer = require('multer')
const os = require('os')

router.post("/register", user.register)
router.post("/login", user.login)
router.post("/logoutTo", user.logoutTo)
router.post("/getUser", user.getUser)

router.post("/getToken", security.getToken)

const storage = multer.diskStorage({
    destination: (req, res, cb) => {
        cb(null, 'uploads')
    }
})
const upload = multer({storage})

router.post("/addFile", upload.single('file'), file.addFile)

module.exports = router