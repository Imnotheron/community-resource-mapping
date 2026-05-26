import { db } from '../src/lib/db'; async function test() { const c = await db.user.count(); console.log('Users:', c); } test();
