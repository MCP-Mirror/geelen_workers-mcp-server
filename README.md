# Workers MCP Server

> **Talk to your Cloudflare Workers from Claude Desktop!**

This is a proof-of-concept of writing a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) Server in a Cloudflare Worker. This gives you a way to extend Claude Desktop (among other MCP clients) by invoking functions in your Worker, which gives you access to any Cloudflare or third-party binding.

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

0. **Download Claude Desktop** https://claude.ai/download
1. **Clone this repo.**<br/>There's a few pieces of novel code that need to hang together to make this work, so for now the way to play with it is to clone this repo first. Then, from within this folder:
2. **`pnpm install`**
3. **Check `wrangler.json`**<br/>The current demo uses both the [Email Routing](https://developers.cloudflare.com/email-routing/) API and [Durable Objects](https://developers.cloudflare.com/durable-objects/). If you don't have access to these, or they're not enabled, comment out the relevant sections in `wrangler.json` or your deploy will fail.
4. **`pnpm deploy:worker`**<br/>This takes your `src/index.ts` file and generates `generated/docs.json` from it, then wraps it in `templates/wrapper.ts` and builds & deploys it using Wrangler.
5. **`pnpm install:claude <worker-name> <worker-url> <entrypoint-name>`**<br/>For me, that's `pnpm install:claude workers-mcp-server https://workers-mcp-server.glen.workers.dev ExampleWorkerMCP`
6. **Restart Claude Desktop** You have to do this pretty often, but you _definitely_ have to do it after running the install step above.

To iterate on your server, do the following:

0. Make your change to `src/index.ts`
1. **`pnpm deploy:worker`**
2. (usually) **Restart Claude Desktop**.<br/>You have to do this whenever you add/remove/change your methods or any of the documentation (Claude doesn't detect changes while it's running). But if you're just updating the code within a method then `pnpm deploy:worker` is enough.

## How it works

There are three pieces to this puzzle.

### 1. Docs generation: `scripts/generate-docs.ts`

The [MCP Specification](https://spec.modelcontextprotocol.io/specification/server/tools/#listing-tools) separates the `tools/list` and `tools/call` operations into separate steps. Most MCP servers have naturally followed suit and separated their schema definition from the implementation, but combining them provides a much better DX for the author.

I'm using [ts-blank-space](https://github.com/bloomberg/ts-blank-space) and [jsdoc-api](https://www.npmjs.com/package/jsdoc-api) to parse the TS and emit the schema, slightly tweaked. This gives you LLM-friendly documentation at build time:

```ts
/**
 * Send a text or HTML email to an arbitrary recipient.
 *
 * @param {string} recipient - The email address of the recipient.
 * @param {string} subject - The subject of the email.
 * @param {string} contentType - The content type of the email. Can be text/plain or text/html
 * @param {string} body - The body of the email. Must match the provided contentType parameter
 * @return {Promise<string>} A success message.
 * @throws {Error} If the email fails to send, or if that destination email address hasn't been verified.
 */
async sendEmail(recipient: string, subject: string, contentType: string, body: string) {
  // ...
}
```

```json
{
  "ExampleWorkerMCP": {
    "exported_as": "ExampleWorkerMCP",
    "description": null,
    "methods": [
      {
        "name": "sendEmail",
        "description": "Send a text or HTML email to an arbitrary recipient.",
        "params": [
          {
            "description": "The email address of the recipient.",
            "name": "recipient",
            "type": "string"
          },
          {
            "description": "The subject of the email.",
            "name": "subject",
            "type": "string"
          },
          {
            "description": "The content type of the email. Can be text/plain or text/html",
            "name": "contentType",
            "type": "string"
          },
          {
            "description": "The body of the email. Must match the provided contentType parameter",
            "name": "body",
            "type": "string"
          }
        ],
        "returns": {
          "description": "A success message.",
          "type": "Promise.<string>"
        }
      }
    ]
  }
}
```

This list of methods is very similar to the required MCP format for `tools/list`, but also gives us a list of the `WorkerEntrypoint` exports names to drive service bindings later.

## Limitations

There are lots. This pizza is straight out of the oven. You may well burn your mouth.

1. `docs.json` is only generated from `src/index.ts`. It doesn't currently crawl imports like a bundler, because no bundler I could find preserved comments in-place in order for me to run the docs generator afterwards.
2. Documentation generation only works for class exports, and can't handle default exports yet. It can, at least, parse `class X {}; export { X as Y }`, but in general most people do `export class X {}` anyway so this is fine for now.
3. The local proxy <-> remote proxy communication doesn't follow any particular RPC spec, but it probably should.
4. Error handling, non-text return values, streaming responses, etc have not really been thought through or aren't yet supported in Claude.
5. No `wrangler dev` support yet, but `wrangler dev --remote` should be possible so you don't have to deploy so often
6. Following on from the above, the spec includes a [`notifications/tools/list_changed` notification](https://spec.modelcontextprotocol.io/specification/server/tools/#list-changed-notification) that should trigger Claude to refresh its list of the tools available, meaning fewer restarts of Claude Desktop. But I haven't implemented that yet.
7. No support for [Resources](https://spec.modelcontextprotocol.io/specification/server/resources/). It might be cool to be able to define the list of verified email addresses as a resource, for example. That would be a resource, right?
8. The docs parsing doesn't yet use TS types to either augment or replace the need for `@param` blocks in the JSDoc
9. The doc generation might be completely superfluous if someone was using a validator like zod or a schema library like typebox. However, I wanted build-time docs generation (i.e. static extraction) and wanted to be as generic as possible, so JSDoc will do for now.

// TODO: short demo video here

This project has 3 parts:

## The Worker itself

`src/index.ts` exports a `ExampleWorkerMCP` class that defines a few methods that Claude can invoke:

* `takeScreenshot` uses the [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) API from Cloudflare to take and return a screenshot of a given URL.
* `sendEmail` uses the [Email Routing](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/) API from Cloudflare to send an email to the owner's address.

![image](https://github.com/user-attachments/assets/95536201-70cd-4fae-9931-eb3ba267e425) ![image](https://github.com/user-attachments/assets/cc3dc7b6-0d44-40b1-abcf-e1f73d16f9b6)
