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
}
