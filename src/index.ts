import { randomInt } from 'node:crypto'

import { config } from 'dotenv'
import consola from 'consola'
import { ExcelProcessor } from './lib/excel-processor.js'

import { chromium } from 'playwright-extra'
import { type ViewportSize } from 'playwright'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'
import randomUserAgent from 'random-useragent'

consola.wrapAll()
chromium.use(stealthPlugin())

const randomDelay = async (min: number = 100, max: number = 1000): Promise<void> => {
  const delay = randomInt(min, max)
  await new Promise(resolve => setTimeout(resolve, delay))
}

async function main() {
  try {
    config()
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--start-maximized',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        `--user-agent=${randomUserAgent.getRandom()}`,
        '--lang=es-ES,es',
        '--disable-features=ChromeWhatsNewUI',
        '--disable-features=AudioServiceOutOfProcess',
        '--disable-features=TranslateUI',
        '--disable-features=BlinkGenPropertyTrees',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=Translate',
        '--disable-ipc-flooding-protection',
        '--password-store=basic',
        '--use-mock-keychain',
        '--force-color-profile=srgb',
      ],
    })
    const page = await browser.newPage({
      ignoreHTTPSErrors: true,
      timezoneId: 'America/Santiago',
      locale: 'es-CL',
    })

    // Configurar viewport aleatorio pero realista
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
    ]
    const viewport = viewports[Math.floor(Math.random() * viewports.length)]
    await page.setViewportSize(viewport as ViewportSize)

    await page.goto('https://login.portales.bancochile.cl/login', { waitUntil: 'networkidle' })
    await randomDelay(200, 600)
    // Llena un dato dummy en el campo que lleva por name = userRut
    await page.fill('input[name="userRut"]', process.env.BCH_RUT!)
    await randomDelay(200, 600)

    await page.fill('input[name="userPassword"]', process.env.BCH_PASSWORD!)
    await randomDelay(200, 600)

    await page.getByRole('button', { name: 'Ingresar a cuenta' }).click()
    await page.waitForURL(
      'https://portalpersonas.bancochile.cl/mibancochile-web/front/persona/index.html#/home',
      { waitUntil: 'load' }
    )
    await randomDelay(200, 400)

    await page.goto(
      'https://portalpersonas.bancochile.cl/mibancochile-web/front/persona/index.html#/movimientos/cuenta/saldos-movimientos',
      { waitUntil: 'load' }
    )
    await randomDelay(5000, 7000)

    // Hacer click en el botón principal "Descargar"
    await page.getByRole('button', { name: 'Descargar' }).first().click()
    await page.waitForLoadState('domcontentloaded')
    await randomDelay(1000, 2000)

    // Buscar el botón "Descargar Excel" con diferentes estrategias
    let excelButton: any = undefined

    try {
      excelButton = page.getByRole('button', { name: 'Descargar Excel' })
      await excelButton.waitFor({ timeout: 5000 })
    } catch {
      try {
        excelButton = page.locator('button:has-text("Excel")').first()
        await excelButton.waitFor({ timeout: 5000 })
      } catch {
        try {
          excelButton = page.locator('.modal button, .dropdown-menu button, .popup button').first()
          await excelButton.waitFor({ timeout: 5000 })
        } catch {
          throw new Error('No se pudo encontrar el botón de descarga Excel')
        }
      }
    }

    // Configurar descarga y hacer click
    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
    await excelButton.click()

    try {
      const download = await downloadPromise

      // Obtener el contenido como buffer sin guardarlo en disco
      const stream = await download.createReadStream()
      const chunks: Buffer[] = []

      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      const excelBuffer = Buffer.concat(chunks)
      console.log('✅ Contenido Excel obtenido en memoria')

      // Procesar Excel desde buffer y convertir a CSV
      const processedData = await ExcelProcessor.processBuffer(excelBuffer)
      console.log(`✅ Procesamiento completado - ${processedData.rows.length} registros procesados`)
    } catch (downloadError) {
      console.error(
        '❌ Error en descarga:',
        downloadError instanceof Error ? downloadError.message : String(downloadError)
      )
      throw downloadError
    }

    console.log('All done, check the screenshot. ✨')
    await browser.close()
  } catch (error) {
    console.error(error)
    throw error
  }
}

await main()
