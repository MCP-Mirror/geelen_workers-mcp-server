import { WorkerEntrypoint } from 'cloudflare:workers'
import puppeteer from '@cloudflare/puppeteer'
import { Env } from '../worker-configuration'

export class ExampleWorkerMCP extends WorkerEntrypoint<Env> {
  /**
   * Takes a screenshot of a given URL
   *
   * @param {string} url The URL to take a screenshot of
   * @param {Array<string>} [clickTheseFirst=[]] An array of buttons to click before taking the screenshot. Useful for
   * clearing any popups or modals that appear on your first visit to a site.
   * @return {Promise<Response>} A promise that resolves to an arraybuffer containing the screenshot
   *
   * @example
   * const response = await worker.takeScreenshot('https://example.com', ['Close'])
   * const img = await response.arrayBuffer()
   */
  async takeScreenshot(url: string, clickTheseFirst: string[] = []) {
    const time = Math.floor(+new Date() / 100000) // Changes every 100 seconds
    const cacheKey = JSON.stringify({ url, clickTheseFirst, time }).replace(/\W+/g, '_').replace(/_+/, '_')

    let img: ArrayBuffer | null = null
    img = await this.env.KV.get(cacheKey, { type: 'arrayBuffer' })

    if (img === null) {
      const browser = await puppeteer.launch(this.env.MYBROWSER)
      const page = await browser.newPage()
      await page.setViewport({ width: 1024, height: 2048 })
      console.log(`Going to ${url}. Cache key ${cacheKey}`)
      await page.goto(url)

      for (const buttonText of clickTheseFirst) {
        try {
          const selector = `::-p-text(${buttonText})`
          console.log(`Waiting for ${selector}`)
          const clickable = await page.waitForSelector(selector, {
            timeout: 5000,
          })
          if (clickable) {
            console.log(`Found it! Clicking...`)
            await clickable.click()
            await scheduler.wait(1000)
          }
        } catch (e) {
          console.log(`Couldn't find button with text ${buttonText}, proceeding...`)
        }
      }
      img = await page.screenshot()
      await this.env.KV.put(cacheKey, img)
      await browser.close()
    }

    return new Response(img, { headers: { 'Content-Type': 'image/png', 'x-img-length': img.byteLength.toString() } })
  }

  async sendEmail(payload: string) {}

  /**
   * Generates a random number. This is extra random because it had to travel half way around the world to be generated.
   *
   * @return {string} A message containing a super duper random number
   * */
  async random() {
    return `Your random number is ${Math.random()}`
  }
}
