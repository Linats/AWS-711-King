import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { CampaignStatus, CouponStatus, ReviewStatus, RiskDecision, Role } from '@coupon/shared';
import { config } from '../config.js';

export interface User { id:string; username:string; passwordHash:string; role:Role; displayName:string; createdAt:string; }
export interface RefreshToken { id:string; userId:string; tokenHash:string; expiresAt:string; revokedAt?:string; replacedById?:string; createdAt:string; }
export interface Campaign { id:string; name:string; description?:string; couponType:string; value:number; totalStock:number; remainingStock:number; perUserLimit:number; startTime:string; endTime:string; status:CampaignStatus; rules:Record<string,unknown>; metadata:Record<string,unknown>; createdBy:string; createdAt:string; updatedAt:string; }
export interface Coupon { id:string; campaignId:string; userId:string; code:string; status:CouponStatus; claimedAt:string; expiresAt:string; verifiedAt?:string; metadata:Record<string,unknown>; }
export interface ClaimRecord { id:string; campaignId:string; userId:string; couponId?:string; result:'issued'|'pending_review'|'blocked'|'rejected'; riskScore?:number; riskDecision?:RiskDecision; requestId:string; createdAt:string; }
export interface RiskRecord { id:string; claimRecordId?:string; userId:string; campaignId:string; source:'ai'|'rule'; riskScore:number; decision:RiskDecision; reasons:string[]; reviewStatus:ReviewStatus; reviewedBy?:string; reviewedAt?:string; reviewComment?:string; approvalExpiresAt?:string; approvalConsumedAt?:string; createdAt:string; }
export interface Verification { id:string; couponId:string; verifierId:string; bizOrderNo:string; result:string; responseSnapshot:Record<string,unknown>; createdAt:string; }
export interface AuditLog { id:string; requestId:string; actorId?:string; action:string; resourceType?:string; resourceId?:string; outcome:string; detail:unknown; createdAt:string; }
export interface AiCallLog { id:string; requestId:string; userId?:string; purpose:string; authMode:string; modelId:string; durationMs:number; status:string; fallbackReason?:string; createdAt:string; }
export interface DatabaseState { version:1; users:User[]; refreshTokens:RefreshToken[]; campaigns:Campaign[]; coupons:Coupon[]; claimRecords:ClaimRecord[]; riskRecords:RiskRecord[]; verifications:Verification[]; auditLogs:AuditLog[]; aiCallLogs:AiCallLog[]; }

const filePath = resolve(config.DATABASE_FILE);
const iso = (offsetDays=0) => new Date(Date.now()+offsetDays*86_400_000).toISOString();

async function seedState(): Promise<DatabaseState> {
  const passwordHash=await bcrypt.hash('Coupon123!',10); const now=iso();
  const users:Array<Omit<User,'passwordHash'|'createdAt'>>=[
    {id:'u-admin',username:'admin',displayName:'系统管理员',role:'admin'}, {id:'u-operator',username:'operator',displayName:'运营人员',role:'operator'}, {id:'u-verifier',username:'verifier',displayName:'核销人员',role:'verifier'},
    {id:'u-customer-a',username:'customer_a',displayName:'用户 A',role:'customer'}, {id:'u-customer-b',username:'customer_b',displayName:'用户 B',role:'customer'}, {id:'u-customer-c',username:'customer_c',displayName:'用户 C',role:'customer'}
  ];
  const campaigns:Campaign[]=[
    {id:'c-summer',name:'夏日清凉满减券',description:'满 50 元可用，适用于全场商品',couponType:'fixed',value:10,totalStock:1000,remainingStock:638,perUserLimit:1,startTime:iso(-2),endTime:iso(20),status:'active',rules:{minimumSpend:50},metadata:{},createdBy:'u-operator',createdAt:now,updatedAt:now},
    {id:'c-new',name:'新用户专享礼券',description:'新用户首单无门槛使用',couponType:'fixed',value:20,totalStock:500,remainingStock:126,perUserLimit:1,startTime:iso(-5),endTime:iso(10),status:'active',rules:{},metadata:{},createdBy:'u-operator',createdAt:now,updatedAt:now},
    {id:'c-coffee',name:'周末咖啡折扣券',description:'周末指定咖啡品类 8 折',couponType:'discount',value:8,totalStock:800,remainingStock:417,perUserLimit:2,startTime:iso(-1),endTime:iso(35),status:'active',rules:{},metadata:{},createdBy:'u-operator',createdAt:now,updatedAt:now},
    {id:'c-draft',name:'国庆预热活动',description:'尚未发布的运营活动',couponType:'fixed',value:30,totalStock:2000,remainingStock:2000,perUserLimit:1,startTime:iso(30),endTime:iso(40),status:'draft',rules:{},metadata:{},createdBy:'u-operator',createdAt:now,updatedAt:now}
  ];
  const coupons:Coupon[]=[{id:'cp-demo',campaignId:'c-new',userId:'u-customer-a',code:'CP-DEMO-2026-001',status:'claimed',claimedAt:iso(-1),expiresAt:iso(10),metadata:{}}];
  const claims:ClaimRecord[]=[{id:'cl-demo',campaignId:'c-new',userId:'u-customer-a',couponId:'cp-demo',result:'issued',riskScore:10,riskDecision:'pass',requestId:'seed',createdAt:iso(-1)}];
  return {version:1,users:users.map(user=>({...user,passwordHash,createdAt:now})),refreshTokens:[],campaigns,coupons,claimRecords:claims,riskRecords:[{id:'r-demo',userId:'u-customer-b',campaignId:'c-summer',source:'ai',riskScore:65,decision:'review',reasons:['短时间请求频率异常'],reviewStatus:'pending',createdAt:iso()}],verifications:[],auditLogs:[],aiCallLogs:[]};
}

class JsonDatabase {
  private state!:DatabaseState;
  private queue:Promise<void>=Promise.resolve();
  readonly ready:Promise<void>;
  constructor(){ this.ready=this.load(); }
  private async load(){ await mkdir(dirname(filePath),{recursive:true}); try{ this.state=JSON.parse(await readFile(filePath,'utf8')) as DatabaseState; }catch(error){ if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error; this.state=await seedState(); await this.persist(); } }
  private async persist(){ const temp=`${filePath}.${process.pid}.${Date.now()}.tmp`; await writeFile(temp,JSON.stringify(this.state,null,2),'utf8'); await rename(temp,filePath); }
  async read<T>(reader:(state:Readonly<DatabaseState>)=>T|Promise<T>):Promise<T>{ await this.ready; await this.queue; return reader(this.state); }
  async write<T>(writer:(state:DatabaseState)=>T|Promise<T>):Promise<T>{ await this.ready; let result!:T; const operation=this.queue.then(async()=>{ result=await writer(this.state); await this.persist(); }); this.queue=operation.then(()=>undefined,()=>undefined); await operation; return result; }
  async reset(){ await this.ready; await this.write(async state=>{ const fresh=await seedState(); Object.assign(state,fresh); }); }
  id(){ return randomUUID(); }
}
export const db=new JsonDatabase();
export const databaseFile=filePath;
