const express = require('express')
const router = express.Router()

const user = require('./routes/user')
const security = require('./routes/security')
const file = require('./routes/file')
const multer = require('multer')
const os = require('os');

router.post("/register", user.register)
router.post("/login", user.login)
router.post("/logoutTo", user.logoutTo)
router.get("/getUser", user.getUser)

router.post("/getToken", security.getToken)
router.post("/checkAdmin", security.checkAdmin)


const storage = multer.diskStorage({
    destination: (req, res, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        const {originalname} = file
        cb(null, originalname)
    }
})
const upload = multer({storage})

router.post("/addFile", upload.single('file'), file.addFile)

module.exports = router