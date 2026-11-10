import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-lake-painters',firestore:{rules:readFileSync('firestore.rules','utf8')}});
let checks=0;
async function allow(label,operation){await assertSucceeds(operation);checks++;console.log('ALLOW '+label)}
async function deny(label,operation){await assertFails(operation);checks++;console.log('DENY '+label)}
const members={jason:{role:'pricing',active:true,customerAccess:true},amy:{role:'pricing',active:true,customerAccess:true},administrator:{role:'administrator',active:true,customerAccess:true},estimator:{role:'estimator',active:true,customerAccess:true},inactive:{role:'pricing',active:false,customerAccess:true},noCustomers:{role:'pricing',active:true,customerAccess:false},unknown:{role:'owner',active:true,customerAccess:true},missingRole:{active:true,customerAccess:true},missingFlags:{role:'pricing'}};
const db=uid=>uid?env.authenticatedContext(uid).firestore():env.unauthenticatedContext().firestore();
const job=(uid,revision=1)=>({payload:JSON.stringify({jobId:'job-test',customer:'Test',markup:1.4,finalPrice:100,primerLaborProduction:200,equipment:[{unitCost:20}]}),revision,updatedBy:uid,updatedAt:serverTimestamp()});
const submission=uid=>({payload:JSON.stringify({jobId:'job-test',customer:'Test',rooms:[],repairs:[]}),submittedBy:uid,submittedAt:serverTimestamp()});
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{for(const [uid,data]of Object.entries(members))await setDoc(doc(c.firestore(),'teamMembers',uid),data)});
 for(const uid of ['jason','amy'])await allow(uid+' creates priced job',setDoc(doc(db(uid),'sharedJobs',uid),job(uid)));
 for(const uid of ['jason','amy','administrator','estimator']){
  await allow(uid+' reads customer job',getDoc(doc(db(uid),'sharedJobs','amy')));
  await allow(uid+' lists customer jobs',getDocs(collection(db(uid),'sharedJobs')));
  await allow(uid+' submits inspection',setDoc(doc(db(uid),'inspectionSubmissions',uid),submission(uid)));
  await allow(uid+' reads own role',getDoc(doc(db(uid),'teamMembers',uid)));
  await deny(uid+' changes own role',updateDoc(doc(db(uid),'teamMembers',uid),{role:'pricing'}));
  await deny(uid+' changes another role',updateDoc(doc(db(uid),'teamMembers','amy'),{role:'estimator'}));
  await deny(uid+' lists memberships',getDocs(collection(db(uid),'teamMembers')));
  await deny(uid+' reads another membership',getDoc(doc(db(uid),'teamMembers',uid==='amy'?'jason':'amy')));
  await deny(uid+' deletes customer job',deleteDoc(doc(db(uid),'sharedJobs','amy')));
  await deny(uid+' edits submission',updateDoc(doc(db(uid),'inspectionSubmissions',uid),{payload:'changed'}));
 }
 for(const uid of ['administrator','estimator']){
  await deny(uid+' creates priced job directly',setDoc(doc(db(uid),'sharedJobs',uid),job(uid)));
  for(const key of ['finalPrice','markup','laborRate','primerLaborProduction','paintCost','equipment']){
   const data=job(uid,2);data.payload=JSON.stringify({[key]:999});
   await deny(uid+' overwrites '+key, setDoc(doc(db(uid),'sharedJobs','amy'),data));
  }
 }
 for(const uid of [null,'stranger','inactive','noCustomers','unknown','missingRole','missingFlags']){
  const label=uid||'anonymous';
  await deny(label+' reads customer',getDoc(doc(db(uid),'sharedJobs','amy')));
  await deny(label+' lists customers',getDocs(collection(db(uid),'sharedJobs')));
  await deny(label+' reads submission',getDoc(doc(db(uid),'inspectionSubmissions','amy')));
  await deny(label+' submits',setDoc(doc(db(uid),'inspectionSubmissions',label),submission(uid||'anon')));
  await deny(label+' writes priced job',setDoc(doc(db(uid),'sharedJobs','amy'),job(uid||'anon',2)));
 }
 await allow('Jason updates Amy priced job',setDoc(doc(db('jason'),'sharedJobs','amy'),job('jason',2)));
 await deny('stale revision',setDoc(doc(db('amy'),'sharedJobs','amy'),job('amy',2)));
 await deny('forged updater',setDoc(doc(db('jason'),'sharedJobs','amy'),job('amy',3)));
 await deny('unapproved extra field',setDoc(doc(db('amy'),'sharedJobs','extra'),{...job('amy'),role:'pricing'}));
 await deny('malformed payload',setDoc(doc(db('amy'),'sharedJobs','bad'),{...job('amy'),payload:{markup:1}}));
 await deny('oversized payload',setDoc(doc(db('amy'),'sharedJobs','big'),{...job('amy'),payload:'a'.repeat(950001)}));
 await deny('forged submission identity',setDoc(doc(db('estimator'),'inspectionSubmissions','forged'),submission('amy')));
 await deny('self provision membership',setDoc(doc(db('stranger'),'teamMembers','stranger'),members.amy));
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'teamMembers','jason'),{active:false}));
 await deny('revoked Jason loses reads',getDoc(doc(db('jason'),'sharedJobs','amy')));
 await deny('revoked Jason loses pricing',setDoc(doc(db('jason'),'sharedJobs','amy'),job('jason',3)));
 console.log('PASS '+checks+' Firebase emulator security assertions');
}finally{await env.cleanup()}
