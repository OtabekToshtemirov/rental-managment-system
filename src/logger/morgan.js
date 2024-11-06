const chalk = require('chalk')
const morgan = require('morgan')

chalk.level = 2
const start = chalk.green(`${'='.repeat(125)}\n`)
const end = chalk.red(`${'='.repeat(125)}\n`)

morgan.token('httpStatus', (req, res) => {
  let statusCode

  if (res.statusCode === 500) {
    statusCode = chalk.red.bold(res.statusCode)
  } else if (res.statusCode >= 400) {
    statusCode = chalk.yellow.bold(res.statusCode)
  } else {
    statusCode = chalk.green.bold(res.statusCode)
  }

  return statusCode
})

morgan.token('httpRequest', (req) => {
  let { method } = req
  const { httpVersion, protocol, originalUrl } = req
  const string = `${method} ${originalUrl} ${protocol.toUpperCase()}/${httpVersion}`

  if (method === 'GET') {
    method = chalk.green.bold(string)
  } else if (method === 'POST') {
    method = chalk.yellow.bold(string)
  } else if (method === 'PUT') {
    method = chalk.blue.bold(string)
  } else if (method === 'PATCH') {
    method = chalk.magenta.bold(string)
  } else if (method === 'DELETE') {
    method = chalk.red.bold(string)
  }

  return method
})

morgan.token('requestBody', (req) =>
  chalk.white.bold(
    `PARAMS => ${JSON.stringify(req.params)}\n${chalk.bold(
      '<<<'
    )} QUERY => ${JSON.stringify(req.query)}\n${chalk.bold(
      '<<<'
    )} BODY => ${JSON.stringify(req.body, null)}`
  )
)

morgan.token('responseBody', (req) => {
  const { successResp, errorResp } = req

  if (successResp) {
    return chalk.green.bold(`DATA => ${JSON.stringify(successResp, null)}`)
  }

  return chalk.red.bold(`DATA => ${JSON.stringify(errorResp, null)}`)
})

module.exports = () =>
  morgan(
    `${start}${chalk.bold(
      '<<<'
    )} :httpRequest :remote-addr :user-agent\n${chalk.bold(
      '<<<'
    )} :requestBody\n\n${chalk.bold(
      '>>>'
    )} :httpStatus :res[content-length] :response-time[0]ms :total-time[0]ms\n${chalk.bold(
      '>>>'
    )} :responseBody\n${end}`
  )
