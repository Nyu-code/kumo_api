const express = require('express')
const router = express.Router()

const user = require('./routes/user')
const security = require('./routes/security')
const file = require('./routes/file')
const multer_config = require('./utils/multer')

router.post("/register", user.register)
router.post("/login", user.login)
// router.post("/logoutTo", user.logoutTo)
router.post("/getToken", security.getToken)
router.post("/verifyToken", security.validateToken)
router.post("/deleteFile", security.verifyToken, user.deleteUserAccess)
router.post("/download/:file_id", security.verifyToken, file.download_file)
router.post("/sendFile", security.verifyToken, multer_config.single('file'), file.sendFile)

router.get("/getUsers", user.getUsers)
router.get("/getSendHistorical", security.verifyToken, user.getSendFiles)
router.get("/receivedFiles", security.verifyToken, user.getReceivedFiles)

module.exports = router