const express = require('express')
const router = express.Router()

const user = require('./routes/user')
const security = require('./routes/security')

router.post("/register", user.register)
router.post("/login", user.login)
router.post("/logoutTo", user.logoutTo)
router.post("/getUser", user.getUser)

router.post("/getToken", security.getToken)
router.post("/checkAdmin", security.checkAdmin)

module.exports = router