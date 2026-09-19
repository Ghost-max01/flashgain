#!/usr/bin/env node
/**
 * Run boochat_membership migration on Supabase
 * Usage: node run_migration.js
 */

const https = require('https');

const config = {
  supabaseUrl: 'https://ujdhuwehpgnsqdnmruuv.supabase.co',
  serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZGh1d2VocGduc3Fkbm1ydXV2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTU5MzExOCwiZXhwIjoyMTAxMTY5MTE4fQ.JY5k4p2yatk06FwISgD2bDp6FVJL4dO-PRD7mgpXmFc'
};

const sql = `
create table if not exists public.boochat_membership (
  user_id text primary key,
  joined_at timestamptz default now()
);

create index if not exists idx_boochat_membership_user on public.boochat_membership(user_id);
`;

console.log('🔄 Executing Boochat migration on Supabase...\n');

const payload = JSON.stringify({ sql: sql.trim() });

const options = {
  hostname: 'ujdhuwehpgnsqdnmruuv.supabase.co',
  port: 443,
  path: '/rest/v1/rpc/exec',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${config.serviceKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers: ${JSON.stringify(res.headers, null, 2)}\n`);

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Migration executed successfully!');
      console.log(`✅ Response: ${data || '(empty response)'}`);
    } else if (res.statusCode === 404) {
      console.log('⚠️  SQL RPC endpoint not available.');
      console.log('\n📌 MANUAL FALLBACK: Run this SQL in your Supabase console:');
      console.log('━'.repeat(60));
      console.log(sql);
      console.log('━'.repeat(60));
      console.log('\n📍 How to run it:');
      console.log('1. Go to: https://app.supabase.com/project/ujdhuwehpgnsqdnmruuv/sql/new');
      console.log('2. Paste the SQL above');
      console.log('3. Click "Run"');
    } else {
      console.log(`⚠️  Response: ${data}`);
    }
    
    // Now try to verify the table exists
    console.log('\n🔍 Verifying table creation...');
    verifyTable();
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  console.log('\n📌 MANUAL FALLBACK: Run this SQL in your Supabase console:');
  console.log('━'.repeat(60));
  console.log(sql);
  console.log('━'.repeat(60));
});

req.write(payload);
req.end();

function verifyTable() {
  const verifyPayload = JSON.stringify({
    sql: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='boochat_membership';"
  });

  const verifyOptions = {
    hostname: 'ujdhuwehpgnsqdnmruuv.supabase.co',
    port: 443,
    path: '/rest/v1/rpc/exec',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.serviceKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(verifyPayload)
    }
  };

  const verifyReq = https.request(verifyOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      if (data.includes('boochat_membership')) {
        console.log('✅ Table verified! boochat_membership exists in your Supabase.');
      } else {
        console.log('⏳ Table creation may still be processing. Check your Supabase console.');
      }
    });
  });

  verifyReq.on('error', () => {
    console.log('⏳ Table verification skipped. Check your Supabase console to confirm.');
  });

  verifyReq.write(verifyPayload);
  verifyReq.end();
}
