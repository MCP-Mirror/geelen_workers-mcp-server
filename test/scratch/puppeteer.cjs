const puppeteer = require('puppeteer-extra')
puppeteer.use(require('puppeteer-extra-plugin-repl')())

puppeteer.launch({ headless: false }).then(async (browser) => {
  const page = await browser.newPage()
  await page.goto('https://nytimes.com')

  // Start an interactive REPL here with the `page` instance.
  await page.repl()
  // Afterwards start REPL with the `browser` instance.
  // await browser.repl()

  await browser.close()
})
