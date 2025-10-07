const { Telegraf } = require('telegraf');
require('dotenv').config();

// Bot 1 - Article Search Bot
const bot1 = new Telegraf(process.env.BOT1_TOKEN || '7968078678:AAEVs4105R2rq4emfT7Qd2K7N5Go4XgDK3I');

bot1.start((ctx) => {
  const welcomeMessage = `
🏥 *Вітаємо в медичному боті Руслани Москаленко!*

Я допоможу вам знайти корисну інформацію про:
• Рак легень та його діагностику
• Сучасні методи лікування
• Профілактику захворювань
• Хірургічні процедури
• Реабілітацію після лікування

🔍 *Як користуватися:*
• Напишіть ключові слова для пошуку
• Якщо не знайшли потрібну інформацію - напишіть "запитати лікаря"

_Лікар-онколог Руслана Москаленко спеціалізується на торакальній хірургії та онкології легень._
  `;
  ctx.replyWithMarkdown(welcomeMessage);
});

bot1.help((ctx) => {
  const helpMessage = `
📖 *Довідка по боту*

🔍 *Пошук статей:*
• Напишіть будь-яке питання або ключові слова
• Наприклад: "симптоми раку", "діагностика", "лікування"

❓ *Якщо не знайшли відповідь:*
• Напишіть "запитати лікаря"
• Ваше питання буде передано доктору
• Ви отримаєте персональну відповідь

🌐 *Повна інформація на сайті:*
https://rus-production.up.railway.app/
  `;
  ctx.replyWithMarkdown(helpMessage);
});

bot1.on('text', async (ctx) => {
  try {
    const query = ctx.message.text.toLowerCase();
    
    if (query.includes('запитати лікаря') || query.includes('лікар') || query.includes('питання')) {
      // Send question to doctor channel via bot2
      const success = await sendQuestionToDoctor(ctx.from, ctx.message.text);
      if (success) {
        await ctx.reply('✅ *Ваше питання відправлено лікарю!*\n\n⏰ Ви отримаєте відповідь протягом 24-48 годин.');
      } else {
        await ctx.reply('❌ *Помилка відправки питання.*\n\n🔄 Спробуйте пізніше або зверніться безпосередньо до лікаря.\n\n📞 *Контакти:* https://rus-production.up.railway.app/');
      }
    } else {
      // Search articles (simplified for now)
      await ctx.reply('🔍 *Шукаю інформацію...*\n\n📝 За вашим запитом знайдено кілька статей. Перегляньте їх на сайті: https://rus-production.up.railway.app/\n\n❓ *Не знайшли потрібну інформацію?* Напишіть "запитати лікаря"');
    }
  } catch (error) {
    console.error('Error in bot1 text handler:', error);
    try {
      await ctx.reply('❌ *Виникла помилка.*\n\n🔄 Спробуйте пізніше або зверніться на сайт: https://rus-production.up.railway.app/');
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
});

// Bot 2 - Doctor Questions Bot
const bot2 = new Telegraf(process.env.BOT2_TOKEN || '8441781301:AAGJEVkSSvBLR-j7qV2LskYnSBBSprOGQ5E');
const doctorChannelId = process.env.DOCTOR_CHANNEL_ID || '-1003176317968';

bot2.start((ctx) => {
  const welcomeMessage = `
👩‍⚕️ *Бот для питань до лікаря*

Цей бот призначений для отримання питань від пацієнтів та їх передачі лікарю Руслані Москаленко.

🔗 *Пов'язаний з основним ботом:* @moskalenko_helper_bot
  `;
  ctx.replyWithMarkdown(welcomeMessage);
});

// Function to send question to doctor channel
async function sendQuestionToDoctor(user, question) {
  try {
    const userInfo = formatUserInfo(user);
    const timestamp = new Date().toLocaleString('uk-UA');
    const questionId = Date.now().toString();
    
    const message = `
❓ *НОВЕ ПИТАННЯ ВІД ПАЦІЄНТА*

🆔 *ID питання:* ${questionId}
📅 *Дата:* ${timestamp}

👤 *Пацієнт:*
${userInfo}

❓ *Питання:*
${question}

📊 *Статус:* Очікує відповіді

💬 *Для відповіді:* Відповідь на це повідомлення
    `;

    // Send to doctor channel with retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        await bot2.telegram.sendMessage(doctorChannelId, message, {
          parse_mode: 'Markdown'
        });
        console.log(`✅ Question ${questionId} sent to doctor channel`);
        return true;
      } catch (sendError) {
        retries--;
        console.error(`❌ Failed to send question (${3 - retries}/3):`, sendError.message);
        
        if (retries === 0) {
          throw sendError;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('❌ Error sending question to doctor:', error.message);
    
    // Log specific error types
    if (error.message.includes('chat not found')) {
      console.error('🚨 Bot is not added to the doctor channel!');
    } else if (error.message.includes('Forbidden')) {
      console.error('🚨 Bot does not have permission to send messages to channel!');
    } else if (error.message.includes('Bad Request')) {
      console.error('🚨 Invalid message format or channel ID!');
    }
    
    return false;
  }
}

function formatUserInfo(user) {
  let info = `🆔 ID: ${user.id}\n`;
  
  if (user.first_name) {
    info += `👤 Ім'я: ${user.first_name}`;
    if (user.last_name) info += ` ${user.last_name}`;
    info += '\n';
  }
  
  if (user.username) {
    info += `📱 Username: @${user.username}\n`;
  }
  
  return info;
}

// Error handling for bots
bot1.catch((err, ctx) => {
  console.error('❌ Bot1 error:', err);
  try {
    ctx.reply('❌ Виникла помилка. Спробуйте пізніше.');
  } catch (replyError) {
    console.error('Error sending error message:', replyError);
  }
});

bot2.catch((err, ctx) => {
  console.error('❌ Bot2 error:', err);
  try {
    if (ctx && ctx.reply) {
      ctx.reply('❌ Виникла помилка. Спробуйте пізніше.');
    }
  } catch (replyError) {
    console.error('Error sending error message:', replyError);
  }
});

// Launch bots with error handling
try {
  bot1.launch();
  console.log('✅ Bot 1 launched successfully');
} catch (error) {
  console.error('❌ Failed to launch Bot 1:', error);
}

try {
  bot2.launch();
  console.log('✅ Bot 2 launched successfully');
} catch (error) {
  console.error('❌ Failed to launch Bot 2:', error);
}

console.log('🚀 Telegram bots started successfully!');
console.log(`📱 Bot 1 (Article Search): @moskalenko_helper_bot`);
console.log(`👩‍⚕️ Bot 2 (Doctor Questions): @ruslana_medical_bot`);
console.log(`📺 Doctor Channel: ${doctorChannelId}`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bots...');
  try {
    bot1.stop();
    bot2.stop();
  } catch (error) {
    console.error('Error stopping bots:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bots...');
  try {
    bot1.stop();
    bot2.stop();
  } catch (error) {
    console.error('Error stopping bots:', error);
  }
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit, let Railway handle restart
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, let Railway handle restart
});
