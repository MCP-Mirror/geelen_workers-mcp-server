import { WorkerEntrypoint } from 'cloudflare:workers'
import puppeteer from '@cloudflare/puppeteer'
import { Env } from '../worker-configuration'
import { EmailMessage } from 'cloudflare:email'
import { createMimeMessage } from 'mimetext'

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
  async #takeScreenshot(url: string, clickTheseFirst?: string[]) {
    const time = Math.floor(+new Date() / 100000) // Changes every 100 seconds
    const cacheKey = JSON.stringify({ url, clickTheseFirst, time })
      .replace(/\W+/g, '_')
      .replace(/^_|_$|(?<=_)_+/, '_')

    let img: ArrayBuffer | null = null
    img = await this.env.KV.get(cacheKey, { type: 'arrayBuffer' })

    if (img === null) {
      const browser = await puppeteer.launch(this.env.MYBROWSER)
      const page = await browser.newPage()
      await page.setViewport({ width: 768, height: 1024 })
      console.log(`Going to ${url}. Cache key ${cacheKey}`)
      await page.goto(url)

      for (const buttonText of clickTheseFirst || []) {
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
    const msg = createMimeMessage()
    const from = 'glen@gmad.dev'
    msg.setSender({ name: 'Claude Desktop', addr: from })
    msg.setRecipient(recipient)
    msg.setSubject(subject)
    msg.addMessage({
      contentType: contentType,
      data: body,
    })

    await this.env.EMAIL.send(new EmailMessage(from, recipient, msg.asRaw()))
    return 'Email sent successfully!'
  }

  /**
   * Generates a random number. This is extra random because it had to travel half way around the world to be generated.
   *
   * @return {string} A message containing a super duper random number
   * */
  async random() {
    return `Your random number is ${Math.random()}`
  }
}
