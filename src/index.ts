import { WorkerEntrypoint } from 'cloudflare:workers'
import puppeteer from '@cloudflare/puppeteer'
import { EmailMessage } from 'cloudflare:email'
import { createMimeMessage } from 'mimetext'
import { Env } from './types'
import { WorkerMCP } from '../lib/WorkerMCP'

/**
 * Anything you define within this class becomes automatically available inside Claude Desktop
 * */
export default class ExampleWorkerMCP extends WorkerEntrypoint<Env> {
  /**
   * Generates a random number. This is extra random because it had to travel all the way to
   * your nearest Cloudflare PoP to be calculated which... something something lava lamps?
   *
   * @return {string} A message containing a super duper random number
   * */
  async getRandomNumber() {
    return `Your random number is ${Math.random()}`
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
    // For users cloning this project who don't have Email Routing enabled:
    if (!this.env.EMAIL) throw new Error(`'EMAIL' binding not present. Have you added it to wrangler.json?`)

    try {
      const msg = createMimeMessage()
      const from = this.env.EMAIL_FROM

      if (from === 'PLEASE CONFIGURE ME') {
        throw new Error(`Please configure the EMAIL_FROM variable in wrangler.json`)
      }
      msg.setSender({ name: 'Claude Desktop', addr: from })
      msg.setRecipient(recipient)
      msg.setSubject(subject)
      msg.addMessage({
        contentType: contentType,
        data: body,
      })

      await this.env.EMAIL.send(new EmailMessage(from, recipient, msg.asRaw()))
      return 'Email sent successfully!'
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  /**
   * Takes a screenshot of a given URL.
   *
   * @param {string} url The URL to take a screenshot of
   * @return {Promise<Response>} A Response with an image/png type body containing the screenshot
   *
   * @example
   * const response = await worker.takeScreenshot('https://example.com')
   * const img = await response.arrayBuffer()
   */
  async takeScreenshot(url: string) {
    // const time = Math.floor(+new Date() / 100000) // Changes every 100 seconds
    // const cacheKey = JSON.stringify({ url, time })
    //   .replace(/\W+/g, '_')
    //   .replace(/^_|_$|(?<=_)_+/, '_')

    // let img: ArrayBuffer | null = null
    // img = await this.env.KV.get(cacheKey, { type: 'arrayBuffer' })
    // if (img === null) {
    const browser = await puppeteer.launch(this.env.MYBROWSER)
    const page = await browser.newPage()
    await page.setViewport({ width: 768, height: 1024 })
    console.log(`Going to ${url}.`)
    // console.log(`Going to ${url}. Cache key ${cacheKey}`)
    await page.goto(url)

    const img = await page.screenshot()
    // await this.env.KV.put(cacheKey, img, { expirationTtl})
    await browser.close()
    // }

    return new Response(img, { headers: { 'Content-Type': 'image/png' } })
  }

  /**
   * Claude can't talk directly to this WorkerEntrypoint over RPC (yet), so we need to define a HTTP handler
   * @ignore (this isn't something Claude should know about, as it can't call it directly)
   */
  async fetch(request: Request): Promise<Response> {
    return new WorkerMCP(this).fetch(request)
  }
}
