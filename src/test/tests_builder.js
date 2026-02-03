import { Builder, By, until } from 'selenium-webdriver';
import 'chromedriver';

(async function testBuilderFlow() {
  console.log("🛠️ Iniciando prueba de NAVEGACIÓN Y BUILDER...");

  // 1. Abrir Navegador
  let driver = await new Builder().forBrowser('chrome').build();

  try {
    // TRUCO PRO: Fijar tamaño de ventana grande (1920x1080)
    // Esto evita que el menú se esconda en modo "móvil"
    await driver.manage().window().setRect({ width: 1920, height: 1080 });

    // 2. Entrar al Home
    await driver.get('http://localhost:5173/');
    console.log("🏠 Home cargado.");

    // 3. Buscar el botón. Vamos a ser más específicos.
    // Buscamos cualquier enlace que lleve al cotizador y esperamos a que sea VISIBLE
    let builderLink = await driver.wait(until.elementLocated(By.css('a[href="/cotizador"]')), 5000);
    
    // IMPORTANTE: Esperar a que el humano pueda verlo antes de hacer clic
    await driver.wait(until.elementIsVisible(builderLink), 5000);

    console.log("🖱️ Navegando hacia el Armador de PC...");
    await builderLink.click();

    // 4. Verificar que cargó el Builder
    // Buscamos la palabra "Procesador" que siempre está en las categorías
    let cpuSection = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Procesador')]")), 5000);

    if (cpuSection) {
        console.log("✅ PRUEBA EXITOSA: El Builder cargó y se ven las categorías.");
    }

  } catch (error) {
    console.error("❌ FALLÓ LA PRUEBA:", error);
    
    // Si falla la navegación, intenta ir directo para verificar si el Builder funciona al menos
    console.log("⚠️ Intentando navegación directa como plan B...");
    try {
        await driver.get('http://localhost:5173/cotizador');
        let cpuSection = await driver.wait(until.elementLocated(By.xpath("//*[contains(text(), 'Procesador')]")), 5000);
        console.log("✅ Plan B exitoso: La página Builder funciona (aunque el botón del Home falló).");
    } catch (e) {
        console.error("❌ El Builder tampoco cargó directo.");
    }

  } finally {
    await new Promise(r => setTimeout(r, 4000));
    await driver.quit();
  }
})();