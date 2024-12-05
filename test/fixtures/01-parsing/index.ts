import { WorkerEntrypoint } from 'cloudflare:workers'

/**
 * This is my entrypoint and it is extremely cool
 */
export class Foo extends WorkerEntrypoint {
  /**
   * A method for doing some COMPLEX CALCULATIONS
   * @return {number} It's just the number 5, ok?
   * */
  bar() {
    return 5
  }

  /**
   * @param num {number} a Number!
   * @return {Promise<string>} It's the word "five" this time, boii
   * */
  async baz(num: number) {
    return 'five'
  }
}

class NotDirectlyExported extends WorkerEntrypoint {
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

export { NotDirectlyExported as DifferentName }
