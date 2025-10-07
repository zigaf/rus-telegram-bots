import { Telegraf, Markup } from 'telegraf';
import { ApiService } from './services/api.service';
import { UserQuestion } from './types';

export class DoctorQuestionsBot {
  private bot: Telegraf;
  private apiService: ApiService;
  private doctorChannelId: string;
  private doctorChatId: string;

  constructor(token: string, apiBaseUrl: string, doctorChannelId: string, doctorChatId: string) {
    this.bot = new Telegraf(token);
    this.apiService = new ApiService(apiBaseUrl);
    this.doctorChannelId = doctorChannelId;
    this.doctorChatId = doctorChatId;
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
• Архівування відповідей

🔗 *Пов'язаний з основним ботом:* @rus_medical_info_bot
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
        await ctx.reply('👩‍⚕️ Цей бот працює автоматично з основним ботом. Використовуйте @rus_medical_info_bot для постановки питань.');
      }
    });

    // Callback queries for question management
    this.bot.action(/^answer_(\w+)$/, async (ctx) => {
      const questionId = ctx.match[1];
      await this.startAnswering(ctx, questionId);
    });

    this.bot.action(/^archive_(\w+)$/, async (ctx) => {
      const questionId = ctx.match[1];
      await this.archiveQuestion(ctx, questionId);
    });

    this.bot.action(/^view_question_(\w+)$/, async (ctx) => {
      const questionId = ctx.match[1];
      await this.viewQuestionDetails(ctx, questionId);
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
      `;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('💬 Відповісти', `answer_${questionId}`)],
        [Markup.button.callback('📋 Деталі', `view_question_${questionId}`)],
        [Markup.button.callback('📁 Архів', `archive_${questionId}`)]
      ]);

      // Send to doctor channel
      await this.bot.telegram.sendMessage(this.doctorChannelId, message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      // Also send to doctor's private chat if different
      if (this.doctorChatId !== this.doctorChannelId) {
        await this.bot.telegram.sendMessage(this.doctorChatId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      }

      console.log(`Question ${questionId} sent to doctor channel`);
      return true;
    } catch (error) {
      console.error('Error sending question to doctor:', error);
      return false;
    }
  }

  private async processIncomingQuestion(ctx: any, message: string) {
    // This method handles questions forwarded from bot1
    // Extract question ID and process accordingly
    const questionIdMatch = message.match(/ID питання:\* (\w+)/);
    if (questionIdMatch) {
      const questionId = questionIdMatch[1];
      await this.viewQuestionDetails(ctx, questionId);
    }
  }

  private async startAnswering(ctx: any, questionId: string) {
    try {
      const question = await this.apiService.getQuestionById(questionId);
      
      if (!question) {
        await ctx.answerCbQuery('❌ Питання не знайдено');
        return;
      }

      const message = `
💬 *Відповідь на питання ${questionId}*

👤 *Пацієнт:* ${question.userId}
❓ *Питання:* ${question.question}

📝 *Напишіть вашу відповідь:*
      `;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('❌ Скасувати', `view_question_${questionId}`)]
        ])
      });

      // Set up answer handler
      this.bot.on('text', async (answerCtx) => {
        if (answerCtx.message.text.startsWith('/')) return;
        
        const answer = answerCtx.message.text;
        await this.sendAnswerToPatient(question, answer);
        
        await answerCtx.reply('✅ *Відповідь відправлена пацієнту!*', {
          parse_mode: 'Markdown'
        });
      });

    } catch (error) {
      console.error('Error starting answer:', error);
      await ctx.answerCbQuery('❌ Помилка при обробці питання');
    }
  }

  private async sendAnswerToPatient(question: UserQuestion, answer: string) {
    try {
      const answerMessage = `
👩‍⚕️ *Відповідь від лікаря Руслани Москаленко*

❓ *Ваше питання:*
${question.question}

💬 *Відповідь:*
${answer}

📅 *Дата відповіді:* ${new Date().toLocaleString('uk-UA')}

⚠️ *Важливо:* Ця відповідь не замінює очну консультацію. При необхідності зверніться до лікаря особисто.

🌐 *Більше інформації на сайті:*
https://rus-medical.railway.app
      `;

      // Send answer to patient
      await this.bot.telegram.sendMessage(question.userId, answerMessage, {
        parse_mode: 'Markdown'
      });

      // Update question status
      await this.apiService.updateQuestionStatus(question.id!, 'answered');

      // Notify doctor channel
      const notificationMessage = `
✅ *Відповідь відправлена пацієнту*

🆔 *ID питання:* ${question.id}
👤 *Пацієнт:* ${question.userId}
📅 *Час відповіді:* ${new Date().toLocaleString('uk-UA')}
      `;

      await this.bot.telegram.sendMessage(this.doctorChannelId, notificationMessage, {
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error sending answer to patient:', error);
    }
  }

  private async archiveQuestion(ctx: any, questionId: string) {
    try {
      await this.apiService.updateQuestionStatus(questionId, 'archived');
      
      await ctx.editMessageText('📁 *Питання архівовано*', {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Назад', `view_question_${questionId}`)]
        ])
      });

      await ctx.answerCbQuery('✅ Питання архівовано');
    } catch (error) {
      console.error('Error archiving question:', error);
      await ctx.answerCbQuery('❌ Помилка при архівуванні');
    }
  }

  private async viewQuestionDetails(ctx: any, questionId: string) {
    try {
      const question = await this.apiService.getQuestionById(questionId);
      
      if (!question) {
        await ctx.answerCbQuery('❌ Питання не знайдено');
        return;
      }

      const userInfo = this.formatUserInfo({
        id: question.userId,
        username: question.username,
        first_name: question.firstName,
        last_name: question.lastName
      });

      const statusEmoji = {
        'pending': '⏳',
        'answered': '✅',
        'archived': '📁'
      };

      const message = `
📋 *Деталі питання ${questionId}*

${statusEmoji[question.status]} *Статус:* ${question.status}
📅 *Дата:* ${question.timestamp.toLocaleString('uk-UA')}

👤 *Пацієнт:*
${userInfo}

❓ *Питання:*
${question.question}

${question.contactInfo ? `📞 *Контакти:* ${question.contactInfo}\n` : ''}
      `;

      const keyboard = [];
      
      if (question.status === 'pending') {
        keyboard.push([Markup.button.callback('💬 Відповісти', `answer_${questionId}`)]);
      }
      
      keyboard.push([Markup.button.callback('📁 Архів', `archive_${questionId}`)]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(keyboard)
      });

    } catch (error) {
      console.error('Error viewing question details:', error);
      await ctx.answerCbQuery('❌ Помилка при завантаженні деталей');
    }
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
    console.log('🤖 Doctor Questions Bot started');
  }

  public stop() {
    this.bot.stop();
  }
}
