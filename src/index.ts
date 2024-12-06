import { WorkerEntrypoint } from 'cloudflare:workers'
import { Env } from './types'
import { WorkerMCP } from '../lib/WorkerMCP'

import { EmailMessage } from 'cloudflare:email'
import { createMimeMessage } from 'mimetext'

/**
 * Anything you define within this class becomes automatically available inside Claude Desktop
 * */
export default class ExampleWorkerMCP extends WorkerEntrypoint<Env> {
  static Resources = {
    /**
     * A URL of a nearby surf camera, to check for local surf conditions
     * */
    local_surf_cam_url: 'https://www.swellnet.com/surfcams/noosa-heads',
    /**
     * This is my email address, to be used whenever I ask to "email me" something.
     * @return {string}
     * */
    my_email_address: (env: Env) => env.MY_EMAIL,
  }

  notThisTho = {
    /**
     * A URL of a nearby surf camera, to check for local surf conditions
     * */
    local_surf_cam_url: 'https://www.swellnet.com/surfcams/noosa-heads',
    /**
     * This is my email address, to be used whenever I ask to "email me" something.
     * @return {string}
     * */
    my_email_address: (env: Env) => env.MY_EMAIL,
  }

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
   * Claude can't talk directly to this WorkerEntrypoint over RPC (yet), so we need to define a HTTP handler
   * @ignore (this isn't something Claude should know about, as it can't call it directly)
   */
  async fetch(request: Request): Promise<Response> {
    return new WorkerMCP(this).fetch(request)
  }
}
