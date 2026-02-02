# PC Builder AI - Asesor de Hardware Inteligente

Plataforma web para la cotización y armado de computadoras, asistida por Inteligencia Artificial (Google Gemini 2.5 Flash) para validar compatibilidad de hardware en tiempo real.

## Descripcion del Proyecto
Este sistema permite a los usuarios seleccionar componentes de PC, recibir alertas de incompatibilidad tecnica (Cuello de botella, Socket incorrecto, etc.) y guardar sus cotizaciones. Utiliza una arquitectura Serverless donde el Frontend se conecta directamente a los servicios en la nube.

## Tecnologias Utilizadas
- Frontend: React + Vite
- Estilos: Tailwind CSS + Bootstrap
- Base de Datos y Autenticacion: Supabase (PostgreSQL)
- Inteligencia Artificial: Google Generative AI (Gemini 2.5 Flash)
- Testing: Vitest + React Testing Library

## Requisitos Previos
Para ejecutar este proyecto localmente se requiere:
- Node.js (Version 18 o superior)
- NPM (Version 9 o superior)

## Instalacion y Configuracion

1. Descomprimir el archivo y abrir la terminal en la carpeta raiz del proyecto "frontend".

2. Instalar las dependencias del proyecto:
   npm install

3. Configurar Variables de Entorno:
   Crear un archivo llamado ".env" en la raiz del proyecto y definir las siguientes variables con sus respectivas credenciales (disponibles en el informe adjunto):
   
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_key_anonima
   VITE_GEMINI_API_KEY=tu_api_key_google

4. Ejecutar el servidor de desarrollo:
   npm run dev

   La aplicacion estara disponible en: http://localhost:5173

## Ejecucion de Pruebas (QA)
El proyecto cuenta con una cobertura de codigo superior al 85% en ramas logicas, validada mediante Vitest.

- Para ejecutar todos los tests unitarios y de integracion:
  npm test

- Para generar el reporte de cobertura (Code Coverage):
  npm run coverage

## Nota sobre Arquitectura
Este proyecto opera bajo una arquitectura Serverless. No requiere la ejecucion de un servidor backend local (Node.js/Express) ya que la logica de negocio y persistencia es manejada directamente desde el cliente hacia Supabase y las APIs de Google.

---
Autor:
Benjamin Reyes
Taller Aplicado de Programacion - Duoc UC