# Workers MCP Server

> **Talk to your Cloudflare Workers from Claude Desktop!**

## NOTE: This has now been superseded by the [Workers MCP](https://github.com/geelen/workers-mcp) package. Go there instead.

This is a proof-of-concept of writing a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) Server in a Cloudflare Worker. This gives you a way to extend Claude Desktop (among other MCP clients) by invoking functions using Cloudflare Worker's [new RPC syntax](https://blog.cloudflare.com/javascript-native-rpc/), which gives you access to any Cloudflare or third-party binding.

You write worker code that looks like this:

```ts
export class ExampleWorkerMCP extends WorkerEntrypoint<Env> {
	/**
	 * Generates a random number. This is extra random because it had to travel all the way to
	 * your nearest Cloudflare PoP to be calculated which... something something lava lamps?
	 *
	 * @return {string} A message containing a super duper random number
	 * */
	async getRandomNumber() {
		return `Your random number is ${Math.random()}`
	}
}
```

And, using the provided MCP proxy, your Claude Desktop can see & invoke these messages:

![image](https://github.com/user-attachments/assets/c16b2631-4eba-4914-8e26-d6ccea0fc578)

> <sub>Yes, I know that `Math.random()` works the same on a Worker as it does on your local machine, but don't tell Claude</sub> 🤫

## Neat! How do I play?

1. **Download Claude Desktop** https://claude.ai/download
2. **Clone this repo.**
3. **`pnpm install`**
4. **Check `wrangler.json`**<br/>The current demo uses both the [Email Routing](https://developers.cloudflare.com/email-routing/) API and [Browser Rendering](https://developers.cloudflare.com/browser-rendering/. If you don't have access to these, or they're not enabled, comment out the relevant sections in `wrangler.json` or your deploy will fail.
5. **`pnpm deploy:worker`**<br/>This takes your `src/index.ts` file and generate `dist/docs.json` from it, then deploys it using Wrangler.
6. **`npx workers-mcp secret generate && npx workers-mcp secret upload`**<br/>This generates a secret in `.dev.vars` and uploads it using `wrangler secret put`. You only need to this once.
7. **`npx workers-mcp install <server-alias> <worker-url>`**
8. **Restart Claude Desktop** You have to do this pretty often, but you _definitely_ have to do it after running the install step above.

To iterate on your server, do the following:

1. Make your change to `src/index.ts`
2. **`pnpm deploy:worker`**
3. (usually) **Restart Claude Desktop**.<br/>You have to do this whenever you add/remove/change your methods or any of the documentation (Claude doesn't detect changes while it's running). But if you're just updating the code within a method then `pnpm deploy:worker` is enough.
