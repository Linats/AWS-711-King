import { databaseFile, db } from './store.js';

if (!process.argv.includes('--force')) {
  console.error('拒绝重置本地数据。若确定要恢复演示数据，请使用 npm run db:reset -- --force');
  process.exit(1);
}

await db.reset();
console.log(`演示数据库已重置：${databaseFile}`);
console.log('6 个演示账号的统一密码：Coupon123!');
