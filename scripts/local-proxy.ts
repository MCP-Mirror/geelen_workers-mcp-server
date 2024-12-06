import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import TOOLS from '../generated/docs.json'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'url'
import { EntrypointDoc } from './types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SHARED_SECRET = fs.readFileSync(path.resolve(__dirname, '../generated/.shared-secret'), 'utf-8')

export function log(...args: any[]) {
  const msg = `[DEBUG ${new Date().toISOString()}] ${args.join(' ')}\n`
  process.stderr.write(msg)
}

const [_, __, claude_name, workers_url, entrypoint_name, ...rest] = process.argv
log(claude_name, workers_url, entrypoint_name)

if (!claude_name || !workers_url || !entrypoint_name || rest.length > 0) {
  console.error('usage: tsx ./scripts/local-proxy.ts <claude_name> <workers_url> <entrypoint_name>')
  process.exit(1)
}

log(JSON.stringify(TOOLS, null, 2))

const server = new Server({ name: claude_name, version: '1.0.0' }, { capabilities: { resources: {}, tools: {} } })

const WORKER_SCHEMA = Object.values(TOOLS as Record<string, EntrypointDoc>).find((tool) => tool.exported_as === 'default')
if (!WORKER_SCHEMA) {
  console.log(`No default exported WorkerEntrypoint found! Check generated/docs.json`)
  process.exit(1)
}

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  log('Received list resources request')

  return {
    resources: (WORKER_SCHEMA.statics.Resources || []).map(({ name, type, description }) => ({
      uri: `resource://${name}`,
      name,
      description,
      mimeType: type === 'string' ? 'text/plain' : undefined,
    })),
  }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  log(JSON.stringify(request, null, 2))
  const { uri } = request.params
  log('Received read resource request: ', uri)

  const resource = (WORKER_SCHEMA.statics.Resources || []).find(({ name }) => `resource://${name}` === uri)
  log(JSON.stringify(resource, null, 2))
  if (!resource) {
    throw new Error(`Couldn't find resource at uri ${uri}`)
  }

  const fetchUrl = `${workers_url}/resources/${resource.name}`
  log(fetchUrl)
  const response = await fetch(fetchUrl, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + SHARED_SECRET,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch resource: ${response.status} ${await response.text()}`)
  }

  return {
    contents: [
      {
        uri,
        // TODO: do other types
        mimeType: 'text/plain',
        text: await response.text(),
      },
    ],
  }
})

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log('Received list tools request')
  return {
    tools: WORKER_SCHEMA.methods.map((doc) => {
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

  const method = WORKER_SCHEMA.methods.find((doc) => doc.name === toolName)

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
  const args = method.params.map((param) => request.params.arguments?.[param.name])

  const init = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + SHARED_SECRET,
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
    const filename = path.join(path.resolve(__dirname, '../tmp'), +new Date() + '.png')
    fs.writeFileSync(filename, buffer)
    const base64 = buffer.toString('base64')
    fs.writeFileSync(filename + '.base64', base64)
    return {
      toolResult: {
        content: [{ type: 'image', data: base64, mimeType: contentType }],
      },
    }
  } else if (contentType?.match(/application\/json/)) {
    const content = JSON.parse(text)
    return 'toolResult' in content
      ? content
      : {
          toolResult: {
            content: Array.isArray(content) ? content : [content],
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
