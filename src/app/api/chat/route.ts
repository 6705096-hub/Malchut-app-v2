import { streamText, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { searchGithubFiles, readGithubFile, writeGithubFile, getBranchSha, createBranch, createPullRequest, mergePullRequest, getProjectTree } from '@/lib/githubAgent';

export const maxDuration = 60;

const PROJECT_ROOT = path.resolve(process.cwd());

function safePath(filePath: string): string | null {
  const resolved = path.resolve(PROJECT_ROOT, filePath);
  if (!resolved.startsWith(PROJECT_ROOT)) return null; // prevent path traversal
  return resolved;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { messages, sessionId } = await req.json();
  const isAdmin = (session as any).user?.role === 'ADMIN';
  const userId = (session as any).user?.id || 'unknown';
  const userName = (session as any).user?.name || 'ממשתמש';

  // Pre-fetch DB data BEFORE calling Gemini
  let dbContext = '';
  try {
    const memoryRecords = await prisma.agentMemory.findMany();
    const memoryText = memoryRecords.length > 0
      ? `\\n\\n🧠 זיכרון לטווח ארוך (הוראות והעדפות שהמשתמש ביקש ממך לזכור לתמיד):\\n${memoryRecords.map(m => `- [${m.key}]: ${m.value}`).join('\\n')}`
      : '\\n\\n🧠 זיכרון לטווח ארוך ריק כעת.';

    const [customers, products, allOrders] = await Promise.all([
      prisma.customer.findMany({
        where: { deletedAt: null } as any,
        select: { id: true, name: true, phone: true, debt: true },
        orderBy: { name: 'asc' }
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, price: true, category: true }
      }),
      (prisma.order.findMany as any)({
        where: { deletedAt: null },
        include: {
          customer: { select: { name: true } },
          items: { include: { product: { select: { name: true } } } }
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const customersWithDebt = customers.filter(c => c.debt > 0);
    const orders: any[] = allOrders as any[];
    const ordersByWeek: Record<string, any[]> = {};
    for (const o of orders) {
      const key = `${o.deliveryWeek} - ${o.deliveryDay}`;
      if (!ordersByWeek[key]) ordersByWeek[key] = [];
      ordersByWeek[key].push(o);
    }
    const ordersText = Object.entries(ordersByWeek)
      .map(([weekDay, weekOrders]) =>
        `  ${weekDay} (${weekOrders.length} הזמנות):\\n` +
        weekOrders.map((o: any) => `    - ${o.customer?.name || 'לא ידוע'}: ${o.items?.map((i: any) => i.product?.name).join(', ')}`).join('\\n')
      ).join('\\n\\n');

    dbContext = `
מידע עדכני ממסד הנתונים (${new Date().toLocaleDateString('he-IL')}):
📋 לקוחות (${customers.length} סה"כ):
${customers.map(c => `- [ID:${c.id}] ${c.name} | טלפון: ${c.phone || 'לא צוין'} | חוב: ₪${c.debt}`).join('\\n')}
⚠️ לקוחות עם חוב: ${customersWithDebt.length > 0 ? customersWithDebt.map(c => `${c.name}: ₪${c.debt}`).join(', ') : 'אין'}
🍽️ מוצרים (${products.length}): ${products.map(p => `[ID:${p.id}] ${p.name} ₪${p.price}`).join(' | ')}
📦 הזמנות (${allOrders.length} סה"כ):
${ordersText || 'אין הזמנות'}
${memoryText}`;
  } catch {
    dbContext = '\\n(שגיאת חיבור זמנית למסד הנתונים)\\n';
  }

  const adminTools = isAdmin ? {
    // --- Universal Agent Tools ---
    readDatabase: {
      description: 'Query the database by writing raw PostgreSQL SQL (e.g. SELECT id, name FROM "User" LIMIT 5). Use this to find IDs of customers, users, products, or records needed to perform other actions. Only basic SELECT queries are recommended to find IDs.',
      parameters: z.object({
        sql: z.string().describe('PostgreSQL query string'),
      }),
      execute: async ({ sql }: { sql: string }) => {
        try {
          // Prevent destructive raw queries
          if (!sql.trim().toUpperCase().startsWith('SELECT')) return { error: 'Only SELECT queries are allowed here. Use callInternalAPI for updates.' };
          const result = await prisma.$queryRawUnsafe(sql);
          return { result };
        } catch (e: any) {
          return { error: e.message };
        }
      }
    },
    callInternalAPI: {
      description: 'Call any internal API route in the application natively as the current user. Use this to perform ANY action the user could do via the UI (e.g. updating kitchen amounts, changing user permissions, etc). First, read the relevant route.ts file using readProjectFile to understand the expected request body and method. Then, execute this tool.',
      parameters: z.object({
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
        endpoint: z.string().describe('The URL path, e.g. "/api/users/123/role" or "/api/kitchen/batch"'),
        body: z.any().optional().describe('JSON object to send as request body'),
      }),
      execute: async ({ method, endpoint, body }: { method: string, endpoint: string, body?: any }) => {
        try {
          // Robust URL resolution for Next.js App Router in Docker/Proxies
          const protocol = req.headers.get('x-forwarded-proto') || 'http';
          const host = req.headers.get('host') || new URL(req.url).host;
          const origin = `${protocol}://${host}`;
          
          const url = `${origin}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
          const cookieHeader = req.headers.get('cookie') || '';
          
          const fetchOptions: RequestInit = {
            method,
            headers: {
              'Cookie': cookieHeader,
              ...(body ? { 'Content-Type': 'application/json' } : {})
            },
          };
          if (body) fetchOptions.body = JSON.stringify(body);
          
          const res = await fetch(url, fetchOptions);
          const responseText = await res.text();
          let parsed;
          try { parsed = JSON.parse(responseText); } catch { parsed = responseText; }
          
          return { status: res.status, ok: res.ok, response: parsed };
        } catch (e: any) {
          return { error: `שגיאה בקריאת API פנימית: ${e.message}` };
        }
      }
    },
    // --- Specific Admin Tools ---
    updateProductPrice: {
      description: 'Update price of a product. ALWAYS confirm first with "כתוב אשר לאישור".',
      parameters: z.object({
        productId: z.string(),
        productName: z.string(),
        newPrice: z.number(),
      }),
      execute: async ({ productId, newPrice }: { productId: string; newPrice: number }) => {
        await prisma.product.update({ where: { id: productId }, data: { price: newPrice } });
        return { success: true, message: `מחיר עודכן ל-₪${newPrice}` };
      }
    },
    softDeleteCustomer: {
      description: 'Move customer to recycle bin. ALWAYS confirm first.',
      parameters: z.object({ customerId: z.string(), customerName: z.string() }),
      execute: async ({ customerId }: { customerId: string }) => {
        await prisma.customer.update({ where: { id: customerId }, data: { deletedAt: new Date(), deletedBy: userId } as any });
        return { success: true, message: 'הלקוח הועבר לסל המיחזור' };
      }
    },
    softDeleteOrder: {
      description: 'Move order to recycle bin. ALWAYS confirm first.',
      parameters: z.object({ orderId: z.string() }),
      execute: async ({ orderId }: { orderId: string }) => {
        await prisma.order.update({ where: { id: orderId }, data: { deletedAt: new Date(), deletedBy: userId } as any });
        return { success: true, message: 'ההזמנה הועברה לסל המיחזור' };
      }
    },
    rememberFact: {
      description: 'Save a persistent fact or preference to your long-term memory so you remember it in all future conversations. Use this when the user says "remember that..." or "always do..."',
      parameters: z.object({
        key: z.string().describe('A short unique identifier for this fact (e.g. "user_name", "price_preference", "default_sort")'),
        value: z.string().describe('The detailed fact or instruction to remember'),
      }),
      execute: async ({ key, value }: { key: string, value: string }) => {
        await prisma.agentMemory.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        });
        return { success: true, message: `✅ נשמר בזיכרון תחת המפתח "${key}": ${value}` };
      }
    },
    forgetFact: {
      description: 'Remove a fact from your long-term memory.',
      parameters: z.object({
        key: z.string().describe('The key of the fact to remove'),
      }),
      execute: async ({ key }: { key: string }) => {
        try {
          await prisma.agentMemory.delete({ where: { key } });
          return { success: true, message: `🗑️ נמחק מהזיכרון המפתח "${key}"` };
        } catch {
          return { error: 'Memory key not found' };
        }
      }
    },
    searchPastChats: {
      description: "Search through the user's past chat sessions and messages for context.",
      parameters: z.object({
        query: z.string().describe('A word or phrase to search for in past conversations'),
      }),
      execute: async ({ query }: { query: string }) => {
        const results = await prisma.chatMessage.findMany({
          where: { content: { contains: query, mode: 'insensitive' }, chatSession: { userId: userId === 'unknown' ? null : userId } },
          include: { chatSession: { select: { title: true, createdAt: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5
        });
        if (results.length === 0) return { message: `לא נמצאו תוצאות עבור "${query}" בשיחות קודמות.` };
        return { 
          results: results.map(r => `[${r.chatSession.title} - ${r.createdAt.toLocaleDateString()}] ${r.role}: ${r.content.substring(0, 100)}...`)
        };
      }
    },
    createCustomer: {
      description: 'Create a new customer in the system. ALWAYS confirm with "כתוב אשר לאישור" before creating.',
      parameters: z.object({
        name: z.string().describe('Full name of the customer'),
        phone: z.string().describe('Phone number (must be unique)'),
        address: z.string().optional().describe('Street address'),
        city: z.string().optional().describe('City'),
      }),
      execute: async ({ name, phone, address, city }: { name: string; phone: string; address?: string; city?: string }) => {
        try {
          const customer = await prisma.customer.create({
            data: { name, phone, address, city }
          });
          return { success: true, message: `✅ לקוח חדש "${name}" נוצר בהצלחה (ID: ${customer.id})` };
        } catch (e: any) {
          if (e.code === 'P2002') return { error: `מספר טלפון ${phone} כבר קיים במערכת` };
          return { error: `שגיאה ביצירת לקוח: ${e.message}` };
        }
      }
    },

    // --- Code Agent Tools ---
    searchProjectFiles: {
      description: "Search for a file by name or content within the src directory. Use this when the user asks to modify something but you don't know the exact file path.",
      parameters: z.object({
        query: z.string().describe('The text to search for (e.g. "AIChatWidget" or "bg-blue-600" or a component name)'),
      }),
      execute: async ({ query }: { query: string }) => {
        if (process.env.GITHUB_PAT) {
          try {
            const files = await searchGithubFiles(query);
            if (files.length === 0) return { error: `לא נמצאו תוצאות עבור "${query}" ב-GitHub` };
            return { files: files.slice(0, 10) };
          } catch (e: any) {
            return { error: `שגיאת חיפוש ב-GitHub: ${e.message}` };
          }
        }
        const results: string[] = [];
        const searchDir = (dir: string) => {
          try {
            const safeDir = safePath(dir);
            if (!safeDir) return;
            const entries = fs.readdirSync(safeDir, { withFileTypes: true });
            for (const e of entries) {
              if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
              const fullPath = path.join(dir, e.name);
              if (e.isDirectory()) {
                searchDir(fullPath);
              } else {
                if (e.name.toLowerCase().includes(query.toLowerCase())) {
                  results.push(fullPath);
                } else {
                  try {
                    const safeFile = safePath(fullPath) || '';
                    const content = fs.readFileSync(safeFile, 'utf-8');
                    if (content.toLowerCase().includes(query.toLowerCase())) {
                      results.push(fullPath);
                    }
                  } catch (err) {}
                }
              }
            }
          } catch (err) {}
        };
        searchDir('src');
        if (results.length === 0) return { error: `לא נמצאו תוצאות עבור "${query}"` };
        return { files: results.slice(0, 5) }; // return top 5 matches
      }
    },
    readProjectFile: {
      description: 'Read the contents of a file in the project. Use this to understand current code before making changes.',
      parameters: z.object({
        filePath: z.string().describe('Relative path from project root, e.g. "src/app/settings/page.tsx"'),
      }),
      execute: async ({ filePath }: { filePath: string }) => {
        if (process.env.GITHUB_PAT) {
          try {
            const file = await readGithubFile(filePath);
            if (!file) return { error: `File not found in GitHub: ${filePath}` };
            return { content: file.content, lines: file.content.split('\\n').length };
          } catch (e: any) {
            return { error: `שגיאת קריאה ב-GitHub: ${e.message}` };
          }
        }
        const safe = safePath(filePath);
        if (!safe) return { error: 'Invalid path' };
        try {
          const content = fs.readFileSync(safe, 'utf-8');
          return { content, lines: content.split('\\n').length };
        } catch {
          return { error: `File not found: ${filePath}` };
        }
      }
    },
    listProjectFiles: {
      description: 'Get a list of files in the project. If running with GitHub PAT, this returns the ENTIRE repository map which is incredibly useful for finding components. Use this ALWAYS when you are not 100% sure of a file path.',
      parameters: z.object({
        dirPath: z.string().optional().describe('Optional prefix, e.g. "src/components" Filter the map.'),
      }),
      execute: async ({ dirPath }: { dirPath?: string }) => {
        if (process.env.GITHUB_PAT) {
          try {
            const tree = await getProjectTree();
            if (!tree) return { error: 'Failed to fetch project tree from GitHub' };
            const matches = dirPath && dirPath !== '/' && dirPath !== '.' 
               ? tree.filter((p: string) => p.startsWith(dirPath))
               : tree;
            return { files: matches.slice(0, 100) }; // cap to 100 to save context
          } catch(e: any) {
             return { error: `שגיאת עץ פרויקט ב-GitHub: ${e.message}` };
          }
        }
        
        const targetDir = dirPath || 'src';
        const safe = safePath(targetDir);
        if (!safe) return { error: 'Invalid path' };
        try {
          const entries = fs.readdirSync(safe, { withFileTypes: true });
          return {
            files: entries
              .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
              .map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' }))
          };
        } catch {
          return { error: `Directory not found: ${dirPath}` };
        }
      }
    },
    writeProjectFile: {
      description: `Write or update a file in the project. 
CRITICAL RULES:
1. ALWAYS read the file first with readProjectFile before writing.
2. ALWAYS show the user exactly what you will change and ask "כתוב **אשר** לאישור" before writing.
3. Only write after receiving explicit "אשר" confirmation.
4. Write COMPLETE valid file content - never partial snippets.`,
      parameters: z.object({
        filePath: z.string().describe('Relative path from project root'),
        content: z.string().describe('Complete new file content'),
        description: z.string().describe('Hebrew description of what was changed'),
      }),
      execute: async ({ filePath, content, description }: { filePath: string; content: string; description: string }) => {
        // Block dangerous paths
        const blocked = ['prisma/schema.prisma', '.env', 'package.json', 'next.config'];
        if (blocked.some(b => filePath.includes(b))) {
          return { error: 'שינוי קובץ זה אסור מטעמי בטיחות. בצע שינוי ידני.' };
        }
        
        if (process.env.GITHUB_PAT) {
          try {
            await writeGithubFile(filePath, content, `bot: ${description}`);
            return { success: true, message: `✅ ${description}. הקובץ ${filePath} עודכן ב-GitHub בהצלחה! השרת האמיתי יתעדכן תוך 2 דקות.` };
          } catch (e: any) {
            return { error: `שגיאה בכתיבה ל-GitHub: ${e.message}` };
          }
        }

        const safe = safePath(filePath);
        if (!safe) return { error: 'Invalid path' };
        try {
          fs.mkdirSync(path.dirname(safe), { recursive: true });
          fs.writeFileSync(safe, content, 'utf-8');
          return { success: true, message: `✅ ${description}. הקובץ ${filePath} עודכן. הדפדפן יתרענן אוטומטית.` };
        } catch (e: any) {
          return { error: `שגיאה בכתיבה: ${e.message}` };
        }
      }
    },
    createPreviewUpdate: {
      description: `Create a safe preview update using a GitHub Pull Request (Branch). 
Use this whenever the user wants to test a visual or code change safely before applying it to the main site.
CRITICAL RULES:
1. ALWAYS read the file first.
2. Tell the user you will create a preview link, and ask for 'אשר' to proceed generating it.
3. After they approve, this tool will create a branch, write the code, and open a PR.
4. Give the user the generated PR link so they can view the Preview Deployment.`,
      parameters: z.object({
        filePath: z.string().describe('Relative path from project root'),
        content: z.string().describe('Complete new file content'),
        description: z.string().describe('Short english description for branch name (no spaces, e.g. update-chat-btn)'),
      }),
      execute: async ({ filePath, content, description }: { filePath: string; content: string; description: string }) => {
        if (!process.env.GITHUB_PAT) return { error: 'GitHub PAT is required for Preview Updates' };
        try {
          // Block dangerous paths
          const blocked = ['prisma/schema.prisma', '.env', 'package.json', 'next.config'];
          if (blocked.some(b => filePath.includes(b))) {
            return { error: 'שינוי קובץ זה אסור מטעמי בטיחות.' };
          }
          const branchName = `preview-${description.replace(/[^a-zA-Z0-9-]/g, '-')}-${Date.now()}`;
          const mainSha = await getBranchSha();
          await createBranch(branchName, mainSha);
          await writeGithubFile(filePath, content, `Preview Update: ${description}`, branchName);
          const pr = await createPullRequest(`Preview: ${description}`, `Automated preview update from Code Agent.\\nFile: ${filePath}`, branchName);
          
          return { 
            success: true, 
            message: `✨ סביבת התצוגה נוצרה בהצלחה!
אם הגדרת ב-Railway מראש את PR Deployments, סביבת התצוגה תופיע תחת אותו הפרויקט ב-Railway בקרוב.

מספר הבקשה: #${pr.number}
לחץ כאן למעבר לבקשה בגיטהאב: ${pr.html_url}

כשתרצה להכניס את השינוי לאתר האמיתי, פשוט כתוב לי "אשר את התצוגה המקדימה" ואני אמזג אותה!`,
            prNumber: pr.number,
            prUrl: pr.html_url
          };
        } catch (e: any) {
          return { error: `שגיאה ביצירת סביבת תצוגה: ${e.message}` };
        }
      }
    },
    approvePreviewUpdate: {
      description: 'Merge an approved preview pull request into the main site.',
      parameters: z.object({
        pullNumber: z.number().describe('The PR number returned from createPreviewUpdate'),
      }),
      execute: async ({ pullNumber }: { pullNumber: number }) => {
        if (!process.env.GITHUB_PAT) return { error: 'GitHub PAT is required' };
        try {
          await mergePullRequest(pullNumber);
          return { success: true, message: `✅ התצוגה המקדימה (PR #${pullNumber}) מוזגה בהצלחה למערכת הראשית! האתר האמיתי יתעדכן כעת.` };
        } catch (e: any) {
          return { error: `שגיאה במיזוג: ${e.message}` };
        }
      }
    },
  } : {};

  // Chat History persistence logic
  let activeSessionId = sessionId;
  if (messages && messages.length > 0) {
     const lastUserMessage = messages[messages.length - 1];
     if (lastUserMessage.role === 'user') {
       if (!activeSessionId) {
          try {
            const newSession = await prisma.chatSession.create({
              data: { 
                userId: userId === 'unknown' ? null : userId,
                title: 'שיחה חדשה...' // Initial generic title
              }
            });
            activeSessionId = newSession.id;
          } catch (e) {
            console.error('Failed to create ChatSession', e);
          }
       }
       if (activeSessionId) {
         try {
           await prisma.chatMessage.create({
             data: {
               sessionId: activeSessionId,
               role: 'user',
               content: lastUserMessage.content
             }
           });
         } catch (e) {
           console.error('Failed to save user message', e);
         }
       }
     }
  }

  let result;
  try {
    result = await streamText({
      model: google('gemini-2.5-flash'),
      messages,
      maxSteps: isAdmin ? 10 : 1,
      tools: adminTools as any,
      system: `אתה עוזר AI של מערכת קייטרינג בשם "מלכות קייטרינג". שמך הוא "העוזר של מלכות".
דבר רק בעברית. אסור בהחלט להשתמש באנגלית.
ענה על שאלות בצורה מקצועית, תמציתית ומועילה.

${isAdmin ? `
🔐 המשתמש: מנהל מערכת (${userName}).

חוקי חובה לפני כל שינוי (DB או קוד):
1. הצג בדיוק מה עומד להשתנות.
2. בקש "כתוב **אשר** לאישור". אם אתה סביבת אינטרנט שדוחפת ל-GitHub, ציין זאת למשתמש - "אשמור ישירות ל-GitHub והאתר יתעדכן לבד".
3. בצע רק אחרי "אשר" מפורש.

כלי Code Agent – יכולות מלאות:
- יש לך כוח אוניברסלי! אם תתבקש לעשות פעולה במערכת (כמו לעדכן מלאי מטבח, הרשאות משתמשים וכו'), אתה לא צריך tool ספציפי לזה. אתה יכול לקרוא לכל API Route פנימי במערכת באמצעות callInternalAPI!
- איך תדע מה לשלוח ל-API? השתמש ב-listProjectFiles כדי לחפש את ה-API המבוקש בתיקיית src/app/api, ואז קרא את הקובץ עם readProjectFile כדי להבין איך הוא עובד.
- איך תדע מזהים (IDs)? השתמש ב-readDatabase כדי לשלוח שאילתת SQL קצרה כדי למצוא את המשתמש או המוצר הרלוונטי!
- אם אתה לא יודע את נתיב הקובץ שהמשתמש מבקש לשנות, חובה עליך להשתמש ב-listProjectFiles כדי להוריד את רשימת כל הקבצים בפרויקט (מפת הפרויקט) כדי למצוא את השם המדויק. אל תנחש שמות קבצים!
- אם המשתמש מבקש לנסות תצוגה מקדימה במערכת הרשת הממשית ולא לכתוב ישירות, השתמש ב-createPreviewUpdate.
- לאחר שהמשתמש בחן את ה-PR והוא מרוצה, בצע approvePreviewUpdate לפי מספר ה-PR.
- אם המשתמש סתם מבקש לעדכן את האתר ולא דורש תצוגה מקדימה, השתמש ב-writeProjectFile.
- אתה יכול להשתמש ב-Web APIs של הדפדפן כמו Web Speech API להקלטת קול.
- אתה יכול להוסיף ספריות קיימות ב-package.json של הפרויקט.
- אתה יכול לכתוב כל קוד TypeScript/TSX שהינו תקני.
- אין הגבלה על יצירת פיצ'רים חדשים מאפס!

שלבי עבודה נכונים:
1. חפש את הקובץ (searchProjectFiles) אם הוא אינו ידוע.
2. קרא את הקובץ הרלוונטי (readProjectFile).
3. הסבר מה תשנה/תוסיף.
4. בקש "אשר".
5. כתוב קוד שלם ותקני (לא קטעי קוד חסרים).
5. הודע שהדפדפן יתרענן אוטומטית.

מבנה הפרויקט (Next.js 14 App Router):
- src/app/ → דפים ו-layouts
- src/components/ → רכיבים משותפים
- src/app/api/ → API routes
- src/app/settings/ → עמודי הגדרות (מנהל)
- src/lib/ → ספריות עזר
- prisma/ → schema (אסור לשנות!)
- .env, package.json → אסור לשנות!

פרוטוקול קול (Web Speech API):
אם המשתמש רוצה הקלטת קול, השתמש ב-Web Speech API:
\`\`\`js
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'he-IL';
recognition.onresult = (e) => { /* handle result */ };
recognition.start();
\`\`\`
זה עובד בדפדפן ללא שירות חיצוני.
` : `
⚠️ המשתמש: ${userName} (משתמש רגיל — אינו מנהל מערכת).

חוקים חשובים:
- אתה יכול לענות על שאלות, לתת מידע, ולהסביר דברים.
- אתה **אינך** מורשה לבצע שינויים במערכת, לעדכן נתונים, לשנות עיצוב, לכתוב קוד, או לבצע פעולות על מסד הנתונים.
- אם המשתמש מבקש שינוי כלשהו במערכת, הסבר בנימוס שרק מנהל מערכת יכול לבצע שינויים, ושיפנה אליו.
- תוכל לעזור עם שאלות כמו: "כמה הזמנות יש היום?", "מי הלקוחות עם חוב?", "מה המסלול שלי?", וכו'.
`}
${dbContext}`,
      async onFinish({ text, toolCalls }) {
         if (activeSessionId && text) {
            try {
              await prisma.chatMessage.create({
                 data: {
                   sessionId: activeSessionId,
                   role: 'assistant',
                   content: text,
                   toolCalls: toolCalls ? JSON.parse(JSON.stringify(toolCalls)) : null
                 }
              });
              await prisma.chatSession.update({
                 where: { id: activeSessionId },
                 data: { updatedAt: new Date() }
              });
  
              // --- New Summary Logic ---
              // Fetch all messages for the session
              const sessionMessages = await prisma.chatMessage.findMany({
                where: { sessionId: activeSessionId },
                orderBy: { createdAt: 'asc' },
                select: { role: true, content: true }
              });
  
              // Filter and format messages for summary
              const conversationForSummary = sessionMessages
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .map(m => `${m.role === 'user' ? 'משתמש' : 'עוזר'}: ${m.content}`)
                .join('\\n');
  
              if (conversationForSummary.length > 0) {
                const { text: summaryResult } = await generateText({
                  model: google('gemini-2.5-flash'),
                  messages: [{ role: 'user', content: `סכם את השיחה הבאה בכותרת קצרה (עד 10 מילים) בעברית. התמקד בנושא העיקרי של השיחה. אם השיחה קצרה מאוד, השתמש בהודעה הראשונה ככותרת. אם אין נושא ברור, השתמש ב"שיחה כללית".\n\n${conversationForSummary}` }],
                  maxTokens: 20 // Limit summary length
                });
                const newTitle = summaryResult.trim();
  
                if (newTitle && newTitle !== 'שיחה חדשה...') { // Avoid updating if summary is empty or generic
                  await prisma.chatSession.update({
                    where: { id: activeSessionId },
                    data: { title: newTitle }
                  });
                }
              }
              // --- End New Summary Logic ---
  
            } catch (e) {
              console.error('Failed to save assistant message or update session title', e);
            }
         }
      }
    });
  } catch (e: any) {
    console.error('Error in streamText call:', e);
    fs.appendFileSync('chat-error.log', `[${new Date().toISOString()}] Error in streamText: ${e.message}\n${e.stack}\n`);
    return new Response(`Internal Server Error: ${e.message}`, { status: 500 });
  }

  return result.toDataStreamResponse({
    headers: {
      'x-session-id': activeSessionId || ''
    }
  });
}
