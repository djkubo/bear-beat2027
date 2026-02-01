/**
 * Start para Render: host 0.0.0.0 y puerto desde PORT (Render = 10000).
 * https://render.com/docs/troubleshooting-deploys#502-bad-gateway
 */
const { spawn } = require('child_process')
const path = require('path')

const port = String(process.env.PORT || '3000')
const cwd = path.join(__dirname, '..')
const child = spawn('npx', ['next', 'start', '-H', '0.0.0.0', '-p', port], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port },
  cwd,
})
child.on('exit', (code) => process.exit(code != null ? code : 0))
