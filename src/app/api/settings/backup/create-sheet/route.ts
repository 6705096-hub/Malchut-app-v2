import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/prisma'
import { getGoogleSheetsClient, getGoogleDriveClient } from '@/lib/googleSheets'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, spreadsheetId, sheetName, shareEmail } = await req.json()

    if (action === 'CREATE_NEW') {
      const sheets = await getGoogleSheetsClient()
      const drive = await getGoogleDriveClient()

      if (!shareEmail) {
        return NextResponse.json({ error: 'חובה להזין אימייל לשיתוף הגיליון' }, { status: 400 })
      }

      // Create a new spreadsheet
      const title = sheetName || `גיבוי מערכת אוטומטי - ${new Date().toLocaleDateString('he-IL')}`
      const createRes = await sheets.spreadsheets.create({
        requestBody: {
          properties: { title },
          sheets: [
            { properties: { title: 'גיבוי הזמנות אוטומטי' } },
            { properties: { title: 'לקוחות גיבוי מלא' } },
            { properties: { title: 'הזמנות גיבוי מלא' } }
          ]
        }
      })

      const newId = createRes.data.spreadsheetId
      const url = createRes.data.spreadsheetUrl

      if (!newId) throw new Error('Failed to create spreadsheet')

      // Share with specific user to bypass domain restrictions
      await drive.permissions.create({
        fileId: newId,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: shareEmail
        }
      })

      // Save the new ID to the database
      await prisma.systemSetting.upsert({
        where: { key: 'GOOGLE_SPREADSHEET_ID' },
        update: { value: newId },
        create: { key: 'GOOGLE_SPREADSHEET_ID', value: newId }
      })

      return NextResponse.json({ success: true, spreadsheetId: newId, url })
    }

    if (action === 'SET_CUSTOM') {
      if (!spreadsheetId) {
        return NextResponse.json({ error: 'Spreadsheet ID is required' }, { status: 400 })
      }
      
      try {
        // Try to automatically add the required tabs if they are missing
        const sheets = await getGoogleSheetsClient()
        const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId })
        const existingSheets = spreadsheetInfo.data.sheets?.map(s => s.properties?.title) || []
        
        const requiredSheets = ['גיבוי הזמנות אוטומטי', 'לקוחות גיבוי מלא', 'הזמנות גיבוי מלא']
        const missingSheets = requiredSheets.filter(rs => !existingSheets.includes(rs))
        
        if (missingSheets.length > 0) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: missingSheets.map(title => ({
                addSheet: {
                  properties: { title }
                }
              }))
            }
          })
        }
      } catch (err: any) {
        console.warn('Could not auto-create tabs for custom spreadsheet:', err.message)
        // We do not throw here so that at least the ID is saved, even if tab creation failed
      }

      // Save the custom ID to the database
      await prisma.systemSetting.upsert({
        where: { key: 'GOOGLE_SPREADSHEET_ID' },
        update: { value: spreadsheetId },
        create: { key: 'GOOGLE_SPREADSHEET_ID', value: spreadsheetId }
      })

      return NextResponse.json({ success: true, spreadsheetId })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Backup settings API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update backup settings' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { getActiveSpreadsheetId } = await import('@/lib/googleSheets')
    const activeId = await getActiveSpreadsheetId()
    
    return NextResponse.json({ 
      success: true, 
      spreadsheetId: activeId || '',
      serviceEmail: process.env.GOOGLE_CLIENT_EMAIL || ''
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
