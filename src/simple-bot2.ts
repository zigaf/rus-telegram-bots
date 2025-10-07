import { Telegraf } from 'telegraf';
import { ApiService } from './services/api.service';

export class SimpleDoctorQuestionsBot {
  private bot: Telegraf;
  private apiService: ApiService;
  private doctorChannelId: string;

  constructor(token: string, apiBaseUrl: string, doctorChannelId: string) {
    this.bot = new Telegraf(token);
    this.apiService = new ApiService(apiBaseUrl);
    this.doctorChannelId = doctorChannelId;
    this.setupHandlers();
  }

  private setupHandlers() {
    // Start command
    this.bot.start((ctx) => {
      const welcomeMessage = `
👩‍⚕️ *Бот для питань до лікаря*

Цей бот призначений для отримання питань від пацієнтів та їх передачі лікарю Руслані Москаленко.

📋 *Функції:*
• Отримання питань від пацієнтів
• Передача питань в канал лікаря
• Відстеження статусу питань

🔗 *Пов'язаний з основним ботом:* @moskalenko_helper_bot
      `;

      ctx.replyWithMarkdown(welcomeMessage);
    });

    // Handle questions from bot1
    this.bot.on('text', async (ctx) => {
      const message = ctx.message.text;
      
      // Check if this is a forwarded question from bot1
      if (message.includes('❓ НОВЕ ПИТАННЯ ВІД ПАЦІЄНТА')) {
        await this.processIncomingQuestion(ctx, message);
      } else {
        // Regular text message
        await ctx.reply('👩‍⚕️ Цей бот працює автоматично з основним ботом. Використовуйте @moskalenko_helper_bot для постановки питань.');
      }
    });
  }

  public async sendQuestionToDoctor(user: any, question: string, questionId: string) {
    try {
      const userInfo = this.formatUserInfo(user);
      const timestamp = new Date().toLocaleString('uk-UA');
      
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

      // Send to doctor channel
      await this.bot.telegram.sendMessage(this.doctorChannelId, message, {
        parse_mode: 'Markdown'
      });

      console.log(`Question ${questionId} sent to doctor channel`);
      return true;
    } catch (error) {
      console.error('Error sending question to doctor:', error);
      return false;
    }
  }

  private async processIncomingQuestion(ctx: any, message: string) {
    // This method handles questions forwarded from bot1
    console.log('Processing incoming question:', message);
  }

  private formatUserInfo(user: any): string {
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

  public launch() {
    this.bot.launch();
    console.log('🤖 Simple Doctor Questions Bot started');
  }

  public stop() {
    this.bot.stop();
  }
}
