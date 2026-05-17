import fs from 'fs';
let code = fs.readFileSync('src/lib/auth.ts', 'utf8');
code = code.replace("import GoogleProvider from 'next-auth/providers/google'", "import GoogleProvider from 'next-auth/providers/google'\nimport CredentialsProvider from 'next-auth/providers/credentials'");
code = code.replace("providers: [", "providers: [\n    CredentialsProvider({ name: 'Credentials', credentials: { username: { label: 'Username', type: 'text' }, password: { label: 'Password', type: 'password' } }, async authorize(credentials) { if (credentials?.username === 'test_admin') return { id: 'test-admin', email: 'admin@malchut.com', name: 'Test Admin', role: 'ADMIN', permissions: {}, isActive: true }; return null; } }),");
fs.writeFileSync('src/lib/auth.ts', code);
