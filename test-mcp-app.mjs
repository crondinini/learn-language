#!/usr/bin/env node
/**
 * Test script for MCP App - calls review_flashcards and shows result
 */
import { readFileSync } from 'fs';

// Load env
const envContent = readFileSync('.env.local', 'utf-8');
const MCP_CLIENT_SECRET = envContent.match(/MCP_CLIENT_SECRET=(.+)/)?.[1]?.trim();

if (!MCP_CLIENT_SECRET) {
  console.error('MCP_CLIENT_SECRET not found in .env.local');
  process.exit(1);
}

const SERVER_URL = 'http://localhost:3001/mcp';
let sessionId = null;

async function mcpRequest(method, params = {}, id = 1) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Authorization': `Bearer ${MCP_CLIENT_SECRET}`,
  };
  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  const body = id !== null
    ? { jsonrpc: '2.0', method, params, id }
    : { jsonrpc: '2.0', method, params }; // notification (no id)

  const response = await fetch(SERVER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  // Capture session ID from response
  const newSessionId = response.headers.get('mcp-session-id');
  if (newSessionId) {
    sessionId = newSessionId;
  }

  const text = await response.text();

  // For notifications, there might be no response
  if (!text.trim()) return null;

  // Parse SSE response if present
  const lines = text.split('\n').filter(l => l.startsWith('data: '));
  if (lines.length > 0) {
    for (const line of lines) {
      try {
        return JSON.parse(line.slice(6));
      } catch {}
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  console.log('🔌 Connecting to MCP server at', SERVER_URL);

  // Initialize
  const initResult = await mcpRequest('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' },
  });
  console.log('✅ Initialized:', initResult?.result?.serverInfo?.name || 'unknown');
  console.log('   Session ID:', sessionId);

  // Send initialized notification
  await mcpRequest('notifications/initialized', {}, null);
  console.log('📨 Sent initialized notification');

  // List tools
  const toolsResult = await mcpRequest('tools/list', {}, 2);
  const tools = toolsResult?.result?.tools || [];
  console.log(`📋 Found ${tools.length} tools:`);
  tools.forEach(t => console.log(`   - ${t.name}: ${t.description?.slice(0, 50)}...`));

  const flashcardTool = tools.find(t => t.name === 'review_flashcards');
  if (flashcardTool) {
    console.log('\n🎴 Found review_flashcards tool');
    console.log('   UI Resource:', flashcardTool._meta?.ui?.resourceUri || flashcardTool._meta?.['ui/resourceUri']);
  } else {
    console.error('\n❌ review_flashcards tool not found!');
    console.log('\nAvailable tools:', tools.map(t => t.name).join(', ') || 'none');
    process.exit(1);
  }

  // Call the tool
  console.log('\n📞 Calling review_flashcards...');
  const callResult = await mcpRequest('tools/call', {
    name: 'review_flashcards',
    arguments: {},
  }, 3);

  if (callResult?.result?.content?.[0]?.text) {
    const data = JSON.parse(callResult.result.content[0].text);
    console.log(`✅ Got ${data.cards?.length || 0} cards from ${data.decks?.length || 0} decks`);

    if (data.cards?.length > 0) {
      console.log('\n📚 Sample cards:');
      data.cards.slice(0, 5).forEach(card => {
        console.log(`   ${card.front} → ${card.back} [${card.difficulty}]`);
      });
    }
  } else {
    console.log('Tool result:', JSON.stringify(callResult, null, 2));
  }

  // Fetch the UI resource
  console.log('\n🖼️  Fetching UI resource...');
  const resourceResult = await mcpRequest('resources/read', {
    uri: 'ui://flashcards/mcp-app.html',
  }, 4);

  if (resourceResult?.result?.contents?.[0]?.text) {
    const htmlSize = resourceResult.result.contents[0].text.length;
    console.log(`✅ UI Resource loaded: ${(htmlSize / 1024).toFixed(1)} KB`);
  } else {
    console.log('Resource result:', JSON.stringify(resourceResult, null, 2).slice(0, 500));
  }

  console.log('\n✨ MCP App test complete!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
