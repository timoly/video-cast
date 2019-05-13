import { Page } from 'puppeteer'

export const channelMapping = [
  'YLE 1',
  'YLE 2',
  'Yle Teema/Fem',
  'Fox',
  'National Geographic',
  'Nat Geo Wild',
  'Viasat Explorer',
  'Viasat Nature',
  'Viasat History',
  'BBC World News',
  'CNN International',
  'Euronews',
  'Boomerang Nordic',
  'Nick Jr Scandinavia',
  'Cartoon Network',
  'Music Television HD',
  'MTV Hits',
  'VH1 Europe'
]

interface Viaplay {
  page: Page
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Cast: any
  username: string
  password: string
  sinkName: string
  channel: string
}

export const viaplay = async function ({
  page,
  Cast,
  username,
  password,
  sinkName,
  channel
}: Viaplay) {
  const channelIndex = channelMapping.findIndex(ch => ch === channel)
  if (channelIndex === -1) {
    throw new Error(`${channel} is not supported`)
  }

  await page.goto('https://viaplay.fi/kanavat')

  if (
    (await page.$('button[data-testhook="header-authenticated-username"')) ===
    null
  ) {
    const loginBtn = '.Navigation-right-1Ki5u'
    await page.waitForSelector(loginBtn, { visible: true })
    await page.click(loginBtn)
    const usernameEl = 'input.username'
    await page.waitForSelector(usernameEl, { visible: true })
    await page.type(usernameEl, username)
    await page.type('input.password', password)
    await page.click('input[type="submit"]')
  }

  await page.waitFor(() => !document.querySelector('.litebox.login-required'))

  const carouselEl = '.Carousel-inner-gyO8I'
  await page.waitForSelector(carouselEl, { visible: true })

  await page.evaluate(
    ({ el, channelCount }) => {
      return new Promise((resolve, reject) => {
        const intervalId = setInterval(() => {
          window.scrollBy(0, window.innerHeight)
          const channels = document.querySelectorAll(el).length

          if (channels === channelCount) {
            clearInterval(intervalId)
            resolve()
          }
        }, 500)

        setTimeout(() => {
          clearInterval(intervalId)
          reject(new Error('unable to load full channel list'))
        }, 5000)
      })
    },
    { el: carouselEl, channelCount: channelMapping.length }
  )

  await page.evaluate(
    ({ el, channelIndex }) => {
      Array.from(document.querySelectorAll(el))
        [channelIndex].querySelector('div[data-testhook="play-button"]')
        .click()
    },
    { el: carouselEl, channelIndex }
  )

  await page.waitForSelector('video', { visible: true })

  await Cast.startTabMirroring({ sinkName })

  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const intervalId = setInterval(() => {
        const chromeCastTextEl = document.querySelector('.chromecast-text')
        if (
          chromeCastTextEl &&
          chromeCastTextEl.textContent &&
          chromeCastTextEl.textContent.includes('Connected')
        ) {
          clearInterval(intervalId)
          resolve()
        }
      })

      setTimeout(reject, 7500)
    })
  })

  return new Promise(resolve => setTimeout(resolve, 2000))
}
