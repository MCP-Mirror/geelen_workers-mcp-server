import puppeteer from '@cloudflare/puppeteer'
import { WorkerEntrypoint } from 'cloudflare:workers'

type Env = {
  MYBROWSER: Fetcher
  KV: KVNamespace
}

export class ExampleWorkerMCP extends WorkerEntrypoint<Env> {
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

      // for (const buttonText of clickTheseFirst || []) {
      //   try {
      //     const selector = `::-p-text(${buttonText})`
      //     console.log(`Waiting for ${selector}`)
      //     const clickable = await page.waitForSelector(selector, {
      //       timeout: 5000,
      //     })
      //     if (clickable) {
      //       console.log(`Found it! Clicking...`)
      //       await clickable.click()
      //       await scheduler.wait(1000)
      //     }
      //   } catch (e) {
      //     console.log(`Couldn't find button with text ${buttonText}, proceeding...`)
      //   }
      // }
      img = await page.screenshot()
      await this.env.KV.put(cacheKey, img!)
      await browser.close()
    }

    return new Response(img, { headers: { 'Content-Type': 'image/png', 'x-img-length': img?.byteLength?.toString() || 'null' } })
  }
}
