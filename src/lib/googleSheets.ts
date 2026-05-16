import { google } from 'googleapis'

// Singleton instance wrapper to abstract Auth
export async function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_CLIENT_EMAIL
  let privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!email || !privateKey) {
    throw new Error('GOOGLE_API_NOT_CONFIGURED')
  }

  // Handle environment variables that might have literal \n escaped
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ],
  })

  // Await the client connection
  const client = await auth.getClient()
  const sheets = google.sheets({ version: 'v4', auth: client as any })

  return sheets
}

export async function getGoogleDriveClient() {
  const email = process.env.GOOGLE_CLIENT_EMAIL
  let privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!email || !privateKey) {
    throw new Error('GOOGLE_API_NOT_CONFIGURED')
  }

  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/drive'
    ],
  })

  const client = await auth.getClient()
  const drive = google.drive({ version: 'v3', auth: client as any })

  return drive
}

/**
 * Appends a new row to the end of a specified sheet.
 */
export async function appendRow(sheetName: string, values: any[]) {
  const sheets = await getGoogleSheetsClient()
  const spreadsheetId = await getActiveSpreadsheetId()
  if (!spreadsheetId) throw new Error('GOOGLE_API_NOT_CONFIGURED')
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [values]
    }
  })
}

/**
 * Clears an entire sheet and rewrites it with headers and new rows.
 */
export async function clearAndOverwriteSheet(sheetName: string, headers: any[], rows: any[][]) {
  const sheets = await getGoogleSheetsClient()

  const spreadsheetId = await getActiveSpreadsheetId()
  if (!spreadsheetId) throw new Error('GOOGLE_API_NOT_CONFIGURED')
  // First clear the existing data
  await sheets.spreadsheets.values.clear({
    spreadsheetId: spreadsheetId,
    range: sheetName,
  })

  // Then write the new payload
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [headers, ...rows]
    }
  })
}

/**
 * Reads all rows from a specified sheet.
 */
export async function readSheet(sheetName: string): Promise<any[][]> {
  const sheets = await getGoogleSheetsClient()

  const spreadsheetId = await getActiveSpreadsheetId()
  if (!spreadsheetId) throw new Error('GOOGLE_API_NOT_CONFIGURED')
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: sheetName,
  })

  return response.data.values || []
}

export async function getActiveSpreadsheetId() {
  const prisma = (await import('@/lib/prisma')).default;
  const dbSetting = await prisma.systemSetting.findUnique({ where: { key: 'GOOGLE_SPREADSHEET_ID' } });
  return dbSetting?.value || process.env.GOOGLE_SPREADSHEET_ID;
}
