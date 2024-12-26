const express = require('express')
const cors = require('cors')
const morgan = require('./logger/morgan')
const router = require('./routes/index.routes')
const expenseRoutes = require('./routes/expense.routes')
const connectDB = require('./config/db')
const errorHandler = require('./middlewares/error-handler')
const { PORT, HOST } = require('./config/environments')

const path = require('path')

const port = PORT || 5000
const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan())
app.use('/api', router)
app.use('/api/expenses', expenseRoutes)
app.use('/api/file', express.static(path.join(`${process.cwd()}/uploads`)))
app.use('*', (req, res) => {
  if (req.params[0] !== '/favicon.ico') {
    return res.status(400).json({
      success: false,
      message: `Route not found by this route ${req.params[0]}`,
    })
  }
})
app.use(errorHandler)

const start = async () => {
  try {
    await connectDB()
    app.listen(port, console.log(`Server running: ${HOST}:${port}`))
  } catch (error) {
    console.log('Error')
  }
}

start()
