import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDocFromServer,serverTimestamp} from 'firebase/firestore';
import {randomUUID} from 'node:crypto';
const env=await initializeTestEnvironment({projectId:'demo-lake-painters',firestore:{rules:readFileSync('firestore.rules','utf8')}});
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{for(const uid of ['Jason','Amy','Estimator'])await setDoc(doc(ctx.firestore(),'teamMembers',uid),{role:uid==='Estimator'?'estimator':'pricing',active:true,customerAccess:true})});
 const els=new Map();function el(id){if(!els.has(id))els.set(id,{value:'',hidden:false,disabled:false,textContent:'',reset(){el('email').value='';el('password').value=''}});return els.get(id)}
 let active=env.unauthenticatedContext().firestore();
 const html=readFileSync('tests/live-permissions.html','utf8');
 const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;$/gm,'');
 const mocks={document:{getElementById:el},crypto:{randomUUID},initializeApp:()=>({}),deleteApp:async()=>{},initializeAuth:()=>({}),inMemoryPersistence:{},getFirestore:()=>({}),doc:(_, ...paths)=>doc(active,...paths),getDocFromServer,setDoc,serverTimestamp,terminate:async()=>{},signInWithEmailAndPassword:async(_,email)=>{active=env.authenticatedContext(email).firestore();return{user:{uid:email}}},signOut:async()=>{active=env.unauthenticatedContext().firestore()}};
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 await new AsyncFunction(...Object.keys(mocks),source)(...Object.values(mocks));
 await el('run').onclick();for(const uid of ['Jason','Amy','Estimator']){el('email').value=uid;el('password').value='not-a-real-password';await el('run').onclick();assert.equal(el('password').value,'');if(el('status').textContent.startsWith('STOP'))throw Error(el('status').textContent)}
 assert.match(el('results').textContent,/COMPLETE — 12 live checks passed/);assert.equal(el('run').hidden,true);assert.equal(el('download').hidden,false);
 console.log('PASS: live-test harness completed all 12 checks against Firestore emulator; password fields cleared, sessions signed out, results available.');
}finally{await env.cleanup()}
