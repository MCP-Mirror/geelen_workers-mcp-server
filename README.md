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
1. **Clone this repo.** There's a few pieces of novel code that need to hang together to make this work, so for now the way to play with it is to clone this repo first. Then, from within this folder:
2. **`pnpm install`**
3. **Check `wrangler.json`** 
4. **`pnpm deploy:worker`**
5. **`pnpm install:claude`**
6. **Restart Claude Desktop** For the moment you have to do this whenever you add/remove/change your methods or any of the documentation (Claude doesn't detect changes while it's running). Note that if you're just updating the code within a method then `pnpm deploy:worker` is enough.

## How it works



From which, LLM-friendly documentation is statically extracted at build time:

```json
{
  "ExampleWorkerMCP": {
    "exported_as": "ExampleWorkerMCP",
    "description": null,
    "methods": [
      {
        "name": "getRandomNumber",
        "description": "Generates a random number. This is extra random because it had to travel all the way to\nyour nearest Cloudflare PoP to be calculated which... something something lava lamps?",
        "params": [],
        "returns": {
          "description": "A message containing a super duper random number",
          "type": "string"
        }
      }
    ]
  }
}
```


// TODO: short demo video here

This project has 3 parts:

## The Worker itself

`src/index.ts` exports a `ExampleWorkerMCP` class that defines a few methods that Claude can invoke:

* `takeScreenshot` uses the [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) API from Cloudflare to take and return a screenshot of a given URL.
* `sendEmail` uses the [Email Routing](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/) API from Cloudflare to send an email to the owner's address.

![image](https://github.com/user-attachments/assets/95536201-70cd-4fae-9931-eb3ba267e425) ![image](https://github.com/user-attachments/assets/cc3dc7b6-0d44-40b1-abcf-e1f73d16f9b6) 
