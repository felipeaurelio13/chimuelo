import { test } from 'vitest';

// --- MOCK DATA / PLACEHOLDERS --- 
const WORKER_URL = "https://maxi-worker.felipeaurelio13.workers.dev"; // <<-- UPDATE THIS WITH YOUR DEPLOYED WORKER URL
const MOCK_AUTH_TOKEN = "your_mock_auth_token_12345"; // <<-- REPLACE WITH A REAL OR MOCK JWT FOR YOUR WORKER
// --- END MOCK DATA / PLACEHOLDERS ---

test('Cloudflare AI Connection and Query', async () => {
  console.log("\n--- Running Cloudflare AI Connection Test ---");

  try {
    console.log(`Testing connection to: ${WORKER_URL}/health`);
    const healthResponse = await fetch(`${WORKER_URL}/health`);
    if (healthResponse.status !== 200) {
      throw new Error(`Health check failed: Status ${healthResponse.status}`);
    }
    const healthData = await healthResponse.json();
    if (healthData.success !== true) {
      throw new Error("Health check returned success: false");
    }
    console.log("✅ Health check successful.");

    console.log(`Testing AI chat endpoint: ${WORKER_URL}/api/openai/chat`);
    const chatResponse = await fetch(`${WORKER_URL}/api/openai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: 'Hello, what is 2+2?',
        }],
      }),
    });

    const chatData = await chatResponse.json();

    if (chatResponse.status === 401) {
      console.warn("⚠️ WARNING: Received 401 Unauthorized. Ensure MOCK_AUTH_TOKEN is valid for your worker or adjust auth middleware in worker/src/index.ts for testing.");
    }

    if (!chatResponse.ok) {
      throw new Error(`AI chat endpoint failed: Status ${chatResponse.status}, Error: ${JSON.stringify(chatData)}`);
    }
    
    if (chatData.success !== true) {
      throw new Error("AI chat response success: false");
    }
    if (!chatData.message) {
      throw new Error("AI chat response missing message");
    }
    if (!chatData.usage) {
      throw new Error("AI chat response missing usage info");
    }
    if (!chatData.model) {
      throw new Error("AI chat response missing model info");
    }

    console.log("✅ AI chat endpoint test successful.");
    console.log("AI Response (excerpt):", chatData.message.substring(0, 100) + "...");

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }
}); 