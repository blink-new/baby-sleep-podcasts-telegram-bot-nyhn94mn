import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const BOT_TOKEN = '7632815832:AAE-1ZVONGw4lJ4HAfVOXKesR2q79YlSpIc';
const WEBHOOK_URL = 'https://nyhn94mn--telegram-bot.functions.blink.new';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method === 'GET') {
    try {
      // Set webhook
      const setWebhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: WEBHOOK_URL,
          allowed_updates: ['message', 'callback_query', 'pre_checkout_query']
        })
      });
      
      const webhookResult = await setWebhookResponse.json();
      
      // Get webhook info
      const getWebhookResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
      const webhookInfo = await getWebhookResponse.json();
      
      // Get bot info
      const getBotResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
      const botInfo = await getBotResponse.json();

      return new Response(JSON.stringify({
        webhook_set: webhookResult,
        webhook_info: webhookInfo,
        bot_info: botInfo,
        webhook_url: WEBHOOK_URL
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Failed to setup webhook',
        details: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }

  return new Response('Use GET to setup webhook', { status: 405 });
});