const BINDINGS = {"ExampleWorkerMCP":{"binding":"MCP","service":"workers-mcp-server","entrypoint":"ExampleWorkerMCP"}}
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
