/**
 * Carga .env y .env.local en scripts de mantenimiento (ejecutados localmente).
 */
import fs from 'fs'
import path from 'path'

const projectRoot = path.resolve(__dirname, '..', '..')

export function loadEnv(): void {
  for (const file of ['.env', '.env.local']) {
    const envPath = path.join(projectRoot, file)
    if (!fs.existsSync(envPath)) continue
    const content = fs.readFileSync(envPath, 'utf8')
    content.split('\n').forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) {
        const key = m[1].trim()
        const val = m[2].trim().replace(/^["']|["']$/g, '')
        process.env[key] = val
      }
    })
  }
}
