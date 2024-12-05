import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import TOOLS from '../generated/docs.json'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function log(...args: any[]) {
  const msg = `[DEBUG ${new Date().toISOString()}] ${args.join(' ')}\n`
  process.stderr.write(msg)
}

const [_, __, claude_name, workers_url, entrypoint_name, ...rest] = process.argv
log(claude_name, workers_url, entrypoint_name)

if (!claude_name || !workers_url || !entrypoint_name || rest.length > 0) {
  console.error('usage: tsx ./scripts/run.ts <claude_name> <workers_url> <entrypoint_name>')
  process.exit(1)
}

log(JSON.stringify(TOOLS, null, 2))

const server = new Server({ name: claude_name, version: '1.0.0' }, { capabilities: { tools: {} } })

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log('Received list tools request')
  log(JSON.stringify(TOOLS[entrypoint_name]))
  return {
    tools: TOOLS[entrypoint_name].methods.map((doc) => {
      return {
        name: doc.name,
        description: doc.description,
        inputSchema: {
          type: 'object',
          properties: Object.fromEntries(doc.params.map(({ name, description, type }) => [name, { description, type }])),
          required: doc.params.map(({ name, optional }) => (optional ? undefined : name)).filter(Boolean),
        },
      }
    }),
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name
  log('Received tool call:', toolName)

  const method = TOOLS[entrypoint_name].methods.find((doc) => doc.name === toolName)

  if (!method) {
    return {
      toolResult: {
        content: [{ type: 'text', text: `Couldn't find method '${toolName}' in entrypoint ${entrypoint_name}` }],
        isError: true,
      },
    }
  }
  log(JSON.stringify(request.params))
  log(JSON.stringify(method.params))
  const args = method.params.map((param) => request.params.arguments[param.name])

  const init = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + fs.readFileSync(path.resolve(__dirname, '../generated/.shared-secret'), 'utf-8'),
    },
    body: JSON.stringify({ entrypoint: entrypoint_name, method: toolName, args }),
  }
  log(JSON.stringify(init))
  const response = await fetch(workers_url + '/rpc', init)

  const bytes = await response.arrayBuffer()
  if (bytes.byteLength === 0) {
    return {
      toolResult: {
        content: [{ type: 'text', text: `Fetch failed. Got (${response.status}) Empty response` }],
        isError: true,
      },
    }
  }
  log(`Got ${bytes.byteLength} bytes`)

  const text = new TextDecoder().decode(bytes)
  if (!response.ok) {
    return {
      toolResult: {
        content: [{ type: 'text', text: `Fetch failed. Got (${response.status}) ${text}` }],
        isError: true,
      },
    }
  }

  const contentType = response.headers.get('content-type')

  if (contentType?.match(/text\/plain/)) {
    return {
      toolResult: {
        content: [{ type: 'text', text }],
      },
    }
  } else if (contentType?.match(/image\//)) {
    const buffer = Buffer.from(bytes)
    fs.writeFileSync(path.join(path.resolve(__dirname, '../tmp'), +new Date() + '.png'), buffer)
    const base64 = buffer.toString('base64')
    return {
      toolResult: {
        content: [{ type: 'image', data: base64, mimeType: contentType }],
      },
    }
  } else {
    return {
      toolResult: {
        content: [{ type: 'text', text: `Unknown contentType ${contentType} ${text}` }],
        isError: true,
      },
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
