import { Builder, By, until } from 'selenium-webdriver';
import 'chromedriver';

(async function testLogin() {
  console.log("🚀 Iniciando prueba automatizada de Login...");

  // Configuración del navegador
  let driver = await new Builder().forBrowser('chrome').build();

  try {
    // 1. Ir a la página
    await driver.get('http://localhost:5173/login');
    
    // 2. Llenar el formulario
    let emailInput = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 5000);
    let passInput = await driver.findElement(By.css('input[type="password"]'));
    let submitBtn = await driver.findElement(By.css('button[type="submit"]'));

    console.log("📝 Escribiendo credenciales de prueba...");
    await emailInput.sendKeys("usuario_robot@test.com");
    await passInput.sendKeys("password123");
    
    // 3. Hacer clic en Ingresar
    console.log("🖱️ Haciendo clic en Ingresar...");
    await submitBtn.click();

    // 4. Esperar la alerta de error (porque el usuario no existe)
    // Buscamos la alerta roja de Bootstrap (.alert-danger)
    let alerta = await driver.wait(until.elementLocated(By.className('alert-danger')), 5000);
    let textoAlerta = await alerta.getText();

    if (textoAlerta.includes("Invalid login credentials") || textoAlerta.includes("Error")) {
        console.log("✅ PRUEBA EXITOSA: El sistema detectó correctamente que el usuario no existe.");
        console.log(`   Mensaje capturado: "${textoAlerta}"`);
    } else {
        console.log("⚠️ ALERTA: Pasó algo inesperado.");
    }

  } catch (error) {
    console.error("❌ FALLÓ LA PRUEBA:", error);
  } finally {
    await new Promise(r => setTimeout(r, 4000)); // Espera 4 seg para que veas el resultado
    console.log("👋 Cerrando navegador...");
    await driver.quit();
  }
})();