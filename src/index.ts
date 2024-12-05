import { WorkerEntrypoint } from 'cloudflare:workers'
import { Env } from '../worker-configuration'
import { EmailMessage } from 'cloudflare:email'
import { createMimeMessage } from 'mimetext'

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
}
