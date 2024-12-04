import { WorkerEntrypoint } from 'cloudflare:workers'
import puppeteer from '@cloudflare/puppeteer'
import { Env } from '../worker-configuration'

export class ExampleWorkerMCP extends WorkerEntrypoint<Env> {
  /**
   * Takes a screenshot of a given URL
   *
   * @param {string} url The URL to take a screenshot of
   * @param {Array<string>} [clickTheseFirst=[]] An array of buttons to click before taking the screenshot
   * @return {Promise<Response>} A promise that resolves to a buffer containing the screenshot
   *
   * @example
   * const response = await worker.takeScreenshot('https://example.com')
   * console.log((await response.arrayBuffer()).toString('base64'))
   */
  async takeScreenshot(url: string, clickTheseFirst: string[] = []) {
    const browser = await puppeteer.launch(this.env.MYBROWSER)
    const page = await browser.newPage()
    await page.setViewport({ width: 1024, height: 2048 })
    console.log(`Going to ${url}`)
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
    const img = await page.screenshot()
    await browser.close()
    return new Response(img, { headers: { 'Content-Type': 'image/jpeg' } })
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
