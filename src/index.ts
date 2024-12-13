import { WorkerEntrypoint } from 'cloudflare:workers'
import puppeteer from '@cloudflare/puppeteer'
import { EmailMessage } from 'cloudflare:email'
import { createMimeMessage } from 'mimetext'
import { Env } from './types'

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
    const browser = await puppeteer.launch(this.env.MYBROWSER)
    const page = await browser.newPage()
    await page.setViewport({ width: 768, height: 1024 })
    await page.goto(url)

    const img = await page.screenshot()
    await browser.close()

    return new Response(img, { headers: { 'Content-Type': 'image/png' } })
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
    try {
      const msg = createMimeMessage()
      const from = this.env.EMAIL_FROM

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
   * Claude can't talk directly to this WorkerEntrypoint over RPC (yet), so we need to define a HTTP handler
   * @ignore (this isn't something Claude should know about, as it can't call it directly)
   */
  async fetch(request: Request): Promise<Response> {
    return new WorkerMCP(this).fetch(request)
  }
}
