import { WorkerEntrypoint } from 'cloudflare:workers'

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

/**
 * This vengabus is coming, sir.
 * */
class Foo extends WorkerEntrypoint {
  /**
   * Reverses a string and converts it to uppercase.
   *
   * @param {string} s - The input string to be transformed.
   * @returns {Promise<string>} A promise that resolves to the transformed string.
   * @throws {TypeError} If the input is not a string.
   *
   * @example
   * const result = await worker.baz("hello");
   * console.log(result); // "OLLEH"
   *
   * @example
   * const result = await worker.baz("JavaScript");
   * console.log(result); // "TPIRCSAVAJ"
   */
  async baz(s: string): Promise<string> {
    return s.split('').reverse().join('').toUpperCase()
  }
}

export { Foo as Foof }
