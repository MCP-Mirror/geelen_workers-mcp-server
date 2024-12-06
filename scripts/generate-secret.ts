/**
 * This file generates a publicly-accessible Worker from an RPC entrypoint definition.
 *
 * This requires exporting a default HTTP handler, which has a self-referential binding
 * */
import path from 'node:path'
import { fileURLToPath } from 'url'
import fs from 'node:fs'
import crypto from 'node:crypto'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const secretPath = path.resolve(__dirname, '../generated/.shared-secret')
if (!fs.existsSync(secretPath) || process.env.REGENERATE_SECRET) {
  console.log(`Generating shared secret...`)
  const randomBytes = crypto.randomBytes(32)
  const randomString = randomBytes.toString('hex')
  fs.writeFileSync(secretPath, randomString)
  console.log(chalk.yellow(`GENERATED NEW SHARED SECRET`))
}
