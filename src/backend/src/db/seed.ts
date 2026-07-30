import { databaseFile, db } from './store.js';

await db.reset();
console.log(`演示数据库已重置：${databaseFile}`);
console.log('6 个演示账号的统一密码：Coupon123!');
