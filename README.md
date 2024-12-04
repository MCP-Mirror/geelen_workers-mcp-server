# Workers MCP Server

This is a proof-of-concept of writing a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) Server in a Cloudflare Worker. This gives you a way to extend Claude Desktop (among other MCP clients) by invoking functions in your Worker, which gives you access to any Cloudflare or third-party binding.

// TODO: short demo video here

This project has 3 parts:

## The Worker itself

`src/index.ts` exports a `ExampleWorkerMCP` class that defines a few methods that Claude can invoke:

* `takeScreenshot` uses the [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) API from Cloudflare to take and return a screenshot of a given URL.
* `sendEmail` uses the [Email Routing](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/) API from Cloudflare to send an email to the owner's address.
