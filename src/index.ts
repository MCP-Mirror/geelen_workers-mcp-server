import { WorkerEntrypoint } from 'cloudflare:workers'

export default {
  async fetch(request, env, ctx): Promise<Response> {
    return new Response('Hello World!')
  },
} satisfies ExportedHandler<Env>

export type X = {
  foo: number
  bar: string
}

/**
 * A class for doing RAD SHIT
 */
export class Baz extends WorkerEntrypoint {
  /**
   * A method for doing OTHER COOL SHIT
   * @return {number} It's just the number 5, ok?
   * */
  foo() {
    return 5
  }

  /**
   * Some method called 'bar'. Takes a number but doesn't use it
   * @param num {number} a Number!
   * @return {Promise<string>} It's the word "five" this time, boii
   * */
  async bar(num: number) {
    return 'five'
  }
}
