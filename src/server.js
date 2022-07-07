const express = require('express')
const bodyParser = require('body-parser')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const dotenv = require('dotenv')
const fs = require('fs')
const https = require('https')
const path = require('path')

dotenv.config()
dotenv.config({ path: ".env.local" })
const apiRouter = require('./routes')

const app = express()

// Logs
app.use(logger('dev'))
// Parse the body into JS objects
app.use(bodyParser.json())
// Parse the cookies
app.use(cookieParser())
// Enable CORS for all requests
app.use(cors())
// Enhance API security
app.use(helmet())

app.get('/', (req, res) => res.send('Api is working'))
app.use('/api', apiRouter)
app.use((req, res, next) => {
    const error = new Error('not found')
    return res.status(404).json({ message: error.message })
})

const credentials = {
    key: fs.readFileSync(path.join(__dirname, process.env.CERT_KEY)),
    cert: fs.readFileSync(path.join(__dirname, process.env.CERT))
}
const HTTPS_PORT = process.env.HTTPS_PORT ?? 6443
const HTTP_PORT = process.env.HTTP_PORT ?? 6080
https.createServer(credentials, app)
.listen(HTTPS_PORT, () => {
    console.log('The server is running on https://localhost:' + HTTPS_PORT + "/api")
})

app.listen(HTTP_PORT, () => {
    console.log('The server is running on http://localhost:' + HTTP_PORT + "/api")
})