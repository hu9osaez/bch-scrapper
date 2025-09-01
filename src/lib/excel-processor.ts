import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as XLSX from 'xlsx'

export interface ProcessedData {
  headers: string[]
  rows: string[][]
  csvContent: string
}

export class ExcelProcessor {
  private filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  /**
   * Procesa el archivo Excel y convierte los datos a CSV
   * Busca la fila con 'Movimientos al' y extrae 100 registros desde columnas B-G
   */
    async processExcelToCSV(): Promise<ProcessedData> {
    try {
      const workbook = this.readExcelFile()
      const firstSheet = this.getFirstSheet(workbook)
      const movimientosRowIndex = this.findMovimientosRow(firstSheet)
      const headers = this.extractHeaders(firstSheet, movimientosRowIndex)
      const dataRows = this.extractDataRows(firstSheet, movimientosRowIndex, headers.length)
      const csvContent = this.convertToCSV(headers, dataRows)
      this.saveCsvFile(csvContent)

      return {
        headers,
        rows: dataRows,
        csvContent
      }

    } catch (error) {
      throw new Error(`Error procesando Excel: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Lee el archivo Excel desde el sistema de archivos
   */
    private readExcelFile(): XLSX.WorkBook {
    try {
      const fileBuffer = readFileSync(this.filePath)
      return XLSX.read(fileBuffer, { type: 'buffer' })
    } catch (error) {
      throw new Error(`Error leyendo archivo Excel: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Obtiene la primera hoja del workbook
   */
      private getFirstSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      throw new Error('No se encontraron hojas en el archivo Excel')
    }

    const sheet = workbook.Sheets[firstSheetName]
    if (!sheet) {
      throw new Error(`No se pudo acceder a la hoja: ${firstSheetName}`)
    }

    return sheet
  }

  /**
   * Busca la fila que contiene 'Movimientos al'
   */
    private findMovimientosRow(sheet: XLSX.WorkSheet): number {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z100')

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        const cell = sheet[cellAddress]

        if (cell && cell.v && typeof cell.v === 'string') {
          const cellValue = cell.v.toLowerCase()
          if (cellValue.includes('movimientos al')) {
            return row
          }
        }
      }
    }

    throw new Error('No se encontró la fila con "Movimientos al"')
  }

  /**
   * Extrae los headers desde la fila siguiente a 'Movimientos al' (columnas B-G)
   */
    private extractHeaders(sheet: XLSX.WorkSheet, movimientosRowIndex: number): string[] {
    const headersRow = movimientosRowIndex + 1
    const headers: string[] = []

    // Columnas B-G (índices 1-6)
    for (let col = 1; col <= 6; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headersRow, c: col })
      const cell = sheet[cellAddress]

      const headerValue = cell && cell.v ? String(cell.v).trim() : `Columna_${String.fromCodePoint(65 + col)}`
      headers.push(headerValue)
    }

    return headers
  }

  /**
   * Extrae 100 registros de datos desde la fila después de los headers
   */
    private extractDataRows(sheet: XLSX.WorkSheet, movimientosRowIndex: number, numColumns: number): string[][] {
    const dataStartRow = movimientosRowIndex + 2
    const dataRows: string[][] = []

    for (let row = dataStartRow; row < dataStartRow + 100; row++) {
      const rowData: string[] = []

      // Columnas B-G (índices 1-6)
      for (let col = 1; col <= numColumns; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        const cell = sheet[cellAddress]

        const cellValue = cell && cell.v !== undefined ? String(cell.v).trim() : ''
        rowData.push(cellValue)
      }

      // Solo agregar filas que no estén completamente vacías
      if (rowData.some(cell => cell !== '')) {
        dataRows.push(rowData)
      }
    }

    return dataRows
  }

  /**
   * Convierte headers y datos a formato CSV
   */
    private convertToCSV(headers: string[], dataRows: string[][]): string {
    const csvLines: string[] = []

    csvLines.push(this.escapeCSVRow(headers))

    for (const row of dataRows) {
      csvLines.push(this.escapeCSVRow(row))
    }

    return csvLines.join('\n')
  }

  /**
   * Escapa una fila para formato CSV (maneja comas, comillas, etc.)
   */
  private escapeCSVRow(row: string[]): string {
    return row.map(cell => {
      // Si la celda contiene comas, comillas o saltos de línea, la envolvemos en comillas
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
        // Escapar comillas duplicándolas
        const escapedCell = cell.replace(/"/g, '""')
        return `"${escapedCell}"`
      }
      return cell
    }).join(',')
  }

  /**
   * Guarda el contenido CSV en un archivo
   */
    private saveCsvFile(csvContent: string): string {
    const csvFileName = this.filePath.replace(/\.(xlsx?|xls)$/i, '.csv')
    const csvPath = join(process.cwd(), csvFileName)

    writeFileSync(csvPath, csvContent, 'utf8')

    return csvPath
  }

  /**
   * Método estático para procesar un archivo Excel directamente
   */
  static async processFile(filePath: string): Promise<ProcessedData> {
    const processor = new ExcelProcessor(filePath)
    return processor.processExcelToCSV()
  }
}
