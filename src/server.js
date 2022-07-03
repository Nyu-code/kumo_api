const express = require('express')
const session = require('express-session')
const bodyParser = require('body-parser')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const dotenv = require('dotenv')

dotenv.config()
dotenv.config({ path: ".env.local" })
const apiRouter = require('./routes')

const app = express()

// Loggin
app.use(logger('dev'))
// Parse the body into JS objects
app.use(bodyParser.json())
// Parse the cookies
app.use(cookieParser())
// Enable CORS for all requests
app.use(cors());
// Enhance API security
app.use(helmet());
const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
    secret: 'grehjznejz4268khgjrez',
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false
}));

app.get('/', (req, res) => res.send('Api is working'));
app.use('/api', apiRouter)
app.use((req, res, next) => {
    const error = new Error('not found')
    return res.status(404).json({ message: error.message })
})

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
    console.log('The server is running on http://localhost:' + PORT + "/api")
})
