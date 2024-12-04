import { WorkerEntrypoint } from 'cloudflare:workers'
import puppeteer from '@cloudflare/puppeteer'
import { Env } from '../worker-configuration'

export class ExampleWorkerMCP extends WorkerEntrypoint<Env> {
  async takeScreenshot(url: string, clickTheseFirst: string[] = []) {
    const browser = await puppeteer.launch(this.env.MYBROWSER)
    const page = await browser.newPage()
    await page.setViewport({ width: 1024, height: 2048 })
    await page.goto(url)

    for (const selector of clickTheseFirst) {
      try {
        const clickable = await page.waitForSelector(`button:has-text("${selector}")`, {
          timeout: 5000,
        })
        if (clickable) {
          await clickable.click()
        }
      } catch (e) {
        console.log(`Couldn't find button with text ${selector}, proceeding...`)
      }
    }
    const img = await page.screenshot()
    await browser.close()
    return new Response(img, { headers: { 'Content-Type': 'image/jpeg' } })
  }

  async sendEmail(payload: string) {}
}

export default {
  async fetch(request: Request, env: Env) {
    const { pathname } = new URL(request.url)

    if (pathname === '/test-browser') {
      return env.MCP.takeScreenshot('https://nytimes.com')
    }

    return new Response(null, { status: 404 })
  },
}
