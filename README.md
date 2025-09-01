# BCH Scraper

Automatización para descargar y procesar cartolas del Banco de Chile, convirtiendo archivos Excel a CSV con formato estructurado.

## 🚀 Características

- **Login automático** al portal del Banco de Chile
- **Descarga automática** de cartolas en formato Excel
- **Procesamiento en memoria** (sin archivos temporales)
- **Conversión a CSV** con nombres timestamped
- **Extracción inteligente** de datos desde columnas B-G
- **Anti-detección** con Playwright + Stealth

## 📋 Requisitos

- Node.js 18+
- Credenciales del Banco de Chile
- Variables de entorno configuradas

## ⚙️ Instalación

```bash
npm install
```

## 🔧 Configuración

Crear archivo `.env` con tus credenciales:

```env
BCH_RUT=12345678-9
BCH_PASSWORD=tu_password
```

## 🏃‍♂️ Uso

```bash
# Ejecutar scraper
npm run dev

# Formatear código
npm run format

# Verificar linting
npm run lint
```

## 📊 Salida

El scraper genera archivos CSV con formato:
- **Nombre**: `cartola-DDMMYYYY--HHmmss.csv`
- **Contenido**: Headers + hasta 100 registros de movimientos
- **Columnas**: Datos extraídos desde columnas B-G del Excel

## 🛠️ Tecnologías

- **Playwright** - Automatización del navegador
- **Stealth Plugin** - Evasión de detección
- **XLSX** - Procesamiento de archivos Excel
- **TypeScript** - Tipado estático
- **Prettier** - Formateo de código

## 📝 Estructura

```
src/
├── index.ts              # Script principal
└── lib/
    ├── excel-processor.ts # Procesador Excel → CSV
    └── anti-detection.ts  # Configuración stealth
```

## ⚠️ Notas

- Usar responsablemente y respetando términos de servicio
- Las credenciales se manejan via variables de entorno
- El scraper incluye delays aleatorios para simular comportamiento humano

## 📄 Licencia

MIT
