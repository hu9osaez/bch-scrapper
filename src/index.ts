import { randomInt } from 'node:crypto'

import { config } from 'dotenv'
import consola from 'consola'
import { ExcelProcessor } from './lib/excel-processor.js'



import { chromium } from 'playwright-extra'
import { type ViewportSize } from 'playwright'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'
import randomUserAgent from 'random-useragent'

consola.wrapAll()
chromium.use(stealthPlugin());

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
        '--force-color-profile=srgb'
      ],

    });
    const page = await browser.newPage({
      ignoreHTTPSErrors: true,
      timezoneId: 'America/Santiago',
      locale: 'es-CL',
    });

    // Configurar viewport aleatorio pero realista
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 }
    ]
    const viewport = viewports[Math.floor(Math.random() * viewports.length)]
    await page.setViewportSize(viewport as ViewportSize)


    await page.goto('https://login.portales.bancochile.cl/login', { waitUntil: 'networkidle' })
    await randomDelay(200, 600)
    // Llena un dato dummy en el campo que lleva por name = userRut
    await page.fill('input[name="userRut"]', process.env.BCH_RUT!);
    await randomDelay(200, 600)

    await page.fill('input[name="userPassword"]', process.env.BCH_PASSWORD!);
    await randomDelay(200, 600)

    await page.getByRole('button', { name: 'Ingresar a cuenta' }).click();
    await page.waitForURL('https://portalpersonas.bancochile.cl/mibancochile-web/front/persona/index.html#/home', { waitUntil: 'load' })
    await randomDelay(200, 400)

    await page.goto('https://portalpersonas.bancochile.cl/mibancochile-web/front/persona/index.html#/movimientos/cuenta/saldos-movimientos', { waitUntil: 'load' })
    await randomDelay(5000, 7000)

    // Screenshot inicial de la página de movimientos
    console.log('📸 Capturando screenshot inicial de la página de movimientos...');
    await page.screenshot({ path: 'debug-01-movimientos-page.png', fullPage: true });

    // Verificar qué botones "Descargar" están disponibles
    console.log('🔍 Buscando botones "Descargar" disponibles...');
    const downloadButtons = await page.locator('button:has-text("Descargar")').all();
    console.log(`📊 Encontrados ${downloadButtons.length} botones con texto "Descargar"`);

    for (const [i, button] of downloadButtons.entries()) {
      if (button) {
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        const text = await button.textContent();
        console.log(`  Botón ${i + 1}: visible=${isVisible}, enabled=${isEnabled}, text="${text}"`);
      }
    }

    // Esperar y hacer click en el botón principal "Descargar"
    console.log('🔽 Haciendo click en el primer botón "Descargar"...');
    await page.getByRole('button', { name: 'Descargar' }).first().click();

    // Screenshot inmediatamente después del click
    console.log('📸 Capturando screenshot después del click en "Descargar"...');
    await page.screenshot({ path: 'debug-02-after-descargar-click.png', fullPage: true });

    await page.waitForLoadState('domcontentloaded');
    await randomDelay(1000, 2000);

    // Screenshot después de esperar el DOM
    console.log('📸 Capturando screenshot después de esperar DOM...');
    await page.screenshot({ path: 'debug-03-after-dom-wait.png', fullPage: true });

    // Verificar si aparecieron nuevos elementos o popups
    console.log('🔍 Verificando elementos que aparecieron después del click...');

    // Buscar modales, popups, overlays
    const modals = await page.locator('[role="dialog"], .modal, .popup, .overlay, .dropdown-menu').all();
    console.log(`🪟 Encontrados ${modals.length} posibles modales/popups`);

    // Buscar botones "Descargar Excel" específicamente
    const excelButtons = await page.locator('button:has-text("Descargar Excel"), button:has-text("Excel")').all();
    console.log(`📋 Encontrados ${excelButtons.length} botones relacionados con Excel`);

    for (const [i, button] of excelButtons.entries()) {
      if (button) {
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        const text = await button.textContent();
        const boundingBox = await button.boundingBox();
        console.log(`  Botón Excel ${i + 1}: visible=${isVisible}, enabled=${isEnabled}, text="${text}", position=${JSON.stringify(boundingBox)}`);
      }
    }

    // Buscar cualquier elemento que contenga "excel" o "xls"
    const allExcelElements = await page.locator('*:has-text("excel"), *:has-text("Excel"), *:has-text("XLS"), *:has-text("xls")').all();
    console.log(`🔎 Encontrados ${allExcelElements.length} elementos que contienen "excel" o "xls"`);

    // Intentar encontrar el botón "Descargar Excel" con diferentes estrategias
    let excelButton: any = undefined;

    try {
      // Estrategia 1: Buscar por texto exacto
      excelButton = page.getByRole('button', { name: 'Descargar Excel' });
      await excelButton.waitFor({ timeout: 5000 });
      console.log('✅ Encontrado botón "Descargar Excel" por texto exacto');
    } catch {
      console.log('⚠️ No se encontró por texto exacto, probando otras estrategias...');

      try {
        // Estrategia 2: Buscar por texto parcial
        excelButton = page.locator('button:has-text("Excel")').first();
        await excelButton.waitFor({ timeout: 5000 });
        console.log('✅ Encontrado botón con "Excel" por texto parcial');
      } catch {
        console.log('⚠️ No se encontró por texto parcial, probando selector más amplio...');

        try {
          // Estrategia 3: Buscar cualquier botón en un modal o dropdown
          excelButton = page.locator('.modal button, .dropdown-menu button, .popup button').first();
          await excelButton.waitFor({ timeout: 5000 });
          console.log('✅ Encontrado botón en modal/dropdown');
        } catch {
          console.log('❌ No se pudo encontrar ningún botón de descarga');
        }
      }
    }

    if (excelButton) {
      // Screenshot antes de hacer click en "Descargar Excel"
      console.log('📸 Capturando screenshot antes del click en "Descargar Excel"...');
      await page.screenshot({ path: 'debug-04-before-excel-click.png', fullPage: true });

      // Configurar el listener de descarga ANTES del click
      console.log('⏳ Configurando listener de descarga...');
      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });

      // Hacer click en "Descargar Excel"
      console.log('📋 Haciendo click en botón de Excel...');
      await excelButton.click();

      // Screenshot inmediatamente después del click en Excel
      console.log('📸 Capturando screenshot después del click en Excel...');
      await page.screenshot({ path: 'debug-05-after-excel-click.png', fullPage: true });

      try {
        console.log('⏳ Esperando evento de descarga...');
        const download = await downloadPromise;
        console.log('✅ Evento de descarga detectado!');

        // Guardar el archivo descargado
        await download.saveAs('descarga.xls');
        console.log('💾 Archivo guardado como descarga.xls');

        // Procesar el Excel y convertir a CSV
        console.log('🔄 Iniciando procesamiento del Excel...');
        try {
          const processedData = await ExcelProcessor.processFile('descarga.xls');
          console.log(`✅ Excel procesado exitosamente:`);
          console.log(`   📊 Headers: ${processedData.headers.join(', ')}`);
          console.log(`   📈 Registros procesados: ${processedData.rows.length}`);
          console.log(`   📁 Archivo CSV generado`);
        } catch (processingError) {
          console.error('❌ Error procesando Excel:', processingError instanceof Error ? processingError.message : String(processingError));
        }

      } catch (downloadError) {
        console.log('❌ Timeout esperando descarga:', downloadError instanceof Error ? downloadError.message : String(downloadError));

        // Screenshot del estado final
        console.log('📸 Capturando screenshot del estado final...');
        await page.screenshot({ path: 'debug-06-download-timeout.png', fullPage: true });

        // Verificar si se abrió alguna nueva pestaña o ventana
        const pages = page.context().pages();
        console.log(`🪟 Páginas abiertas: ${pages.length}`);

        // Verificar si hay algún iframe que pueda contener la descarga
        const frames = page.frames();
        console.log(`🖼️ Frames disponibles: ${frames.length}`);

        // Intentar buscar enlaces de descarga directa
        const downloadLinks = await page.locator('a[href*=".xls"], a[href*=".xlsx"], a[download]').all();
        console.log(`🔗 Enlaces de descarga encontrados: ${downloadLinks.length}`);

        if (downloadLinks.length > 0 && downloadLinks[0]) {
          console.log('🔗 Intentando descargar usando enlace directo...');
          await downloadLinks[0].click();
          await randomDelay(3000, 5000);
        }
      }
    } else {
      console.log('❌ No se pudo encontrar el botón de descarga Excel');
      // Screenshot del estado cuando no se encuentra el botón
      await page.screenshot({ path: 'debug-07-no-excel-button.png', fullPage: true });
    }
    await page.screenshot({ path: 'stealth.png', fullPage: true })

    console.log('All done, check the screenshot. ✨')
    await browser.close()
	} catch (error) {
		console.error(error);
		throw error;
	}
}


await main()
