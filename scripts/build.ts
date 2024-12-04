/**
 * This file generates a publicly-accessible Worker from an RPC entrypoint definition.
 *
 * This requires exporting a default HTTP handler, which has a self-referential binding
 * */
import { parseJSONC } from 'confbox'
import path from 'node:path'
import { fileURLToPath } from 'url'
import fs from 'node:fs'
import crypto from 'node:crypto'
import chalk from 'chalk'
import index from 'just-index'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const wranglerConfig = parseJSONC(fs.readFileSync(path.resolve(__dirname, '../wrangler.json'), 'utf8')) as {
  main: string
  name: string
  services?: {
    binding: string
    service: string
    entrypoint: string
  }[]
}

console.dir(wranglerConfig, { depth: null })

const selfReferentialBindings = (wranglerConfig.services || []).filter((s) => s.service === wranglerConfig.name)
if (selfReferentialBindings.length === 0) {
  throw new Error(`Could not find self-referential binding for ${wranglerConfig.name}.
  Got: ${JSON.stringify({ services: wranglerConfig.services }, null, 2)}
  Add { binding: 'MCP', service: '${wranglerConfig.name}', entrypoint: '<your-entrypoint>' }`)
}

const entrypoints = index(selfReferentialBindings, 'entrypoint')
console.log({ entrypoints })

fs.writeFileSync(
  path.resolve(__dirname, '../generated/index.ts'),
  'const BINDINGS = ' +
    JSON.stringify(entrypoints) +
    `
export * from '../src/index.ts'

export default {
  async fetch(request: Request, env: Env) {
    const { pathname } = new URL(request.url)

    if (pathname === '/test-browser') {
      return env.MCP.takeScreenshot('https://nytimes.com', ['Continue'])
    }

    if (pathname === '/test-secret') {
      return Response.json({ secret: env.SHARED_SECRET })
    }

    if (pathname === '/rpc' && request.method === 'POST') {
    	const authorization = request.headers.get('Authorization')?.replace(/^Bearer /, '') || ''
    	if (authorization !== env.SHARED_SECRET || env.SHARED_SECRET.length !== 64) {
				return new Response('Unauthorized', { status: 401 })
    	}

			const { entrypoint, method, args = [] } = await request.json()
			console.log({ entrypoint, method, args })
			const binding = BINDINGS[entrypoint]
			if (!binding) return new Response(null, { status: 404 })
			console.log({binding })

			const stub = env[binding.binding]
			const result = await stub[method](...args)
			if (result instanceof Response) {
				return result
			} else if (typeof result === 'string') {
				return new Response(result)
			} else {
				return Response.json(result)
			}
    }

    return new Response(null, { status: 404 })
  },
}
`,
)

const secretPath = path.resolve(__dirname, '../generated/.shared-secret')
if (!fs.existsSync(secretPath) || process.env.REGENERATE_SECRET) {
  console.log(`Generating shared secret...`)
  const randomBytes = crypto.randomBytes(32)
  const randomString = randomBytes.toString('hex')
  fs.writeFileSync(secretPath, randomString)
  console.log(chalk.yellow(`GENERATED NEW SHARED SECRET`))
  console.log(`Remember to run ${chalk.blue('pnpm update:secret')} before trying to use your worker.`)
}
