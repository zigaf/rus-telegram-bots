import { Telegraf } from 'telegraf';
import { ApiService } from './services/api.service';

export class SimpleArticleSearchBot {
  private bot: Telegraf;
  private apiService: ApiService;
  private frontendUrl: string;

  constructor(token: string, apiBaseUrl: string, frontendUrl: string) {
    this.bot = new Telegraf(token);
    this.apiService = new ApiService(apiBaseUrl);
    this.frontendUrl = frontendUrl;
    this.setupHandlers();
  }

  private setupHandlers() {
    // Start command
    this.bot.start((ctx) => {
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

    // Help command
    this.bot.help((ctx) => {
      const helpMessage = `
📖 *Довідка по боту*

🔍 *Пошук статей:*
• Напишіть будь-яке питання або ключові слова
• Наприклад: "симптоми раку", "діагностика", "лікування"

📋 *Категорії статей:*
• Діагностика
• Лікування  
• Профілактика
• Хірургія
• Інновації
• Реабілітація

❓ *Якщо не знайшли відповідь:*
• Напишіть "запитати лікаря"
• Ваше питання буде передано доктору
• Ви отримаєте персональну відповідь

🌐 *Повна інформація на сайті:*
${this.frontendUrl}
      `;

      ctx.replyWithMarkdown(helpMessage);
    });

    // Text messages - search articles
    this.bot.on('text', async (ctx) => {
      const query = ctx.message.text.toLowerCase();
      
      if (query.includes('запитати лікаря') || query.includes('лікар') || query.includes('питання')) {
        await this.askDoctorQuestion(ctx);
        return;
      }

      await ctx.reply('🔍 Шукаю інформацію...');

      try {
        const articles = await this.apiService.searchArticles(ctx.message.text);
        
        if (articles.length === 0) {
          const noResultsMessage = `
😔 *Не знайшов статей за запитом: "${ctx.message.text}"*

💡 *Спробуйте:*
• Використати інші ключові слова
• Написати "запитати лікаря" для персональної консультації

❓ *Запитати у лікаря* - отримайте персональну консультацію
          `;

          ctx.replyWithMarkdown(noResultsMessage);
        } else {
          await this.sendSearchResults(ctx, articles, ctx.message.text);
        }
      } catch (error) {
        console.error('Search error:', error);
        ctx.reply('❌ Помилка при пошуку. Спробуйте пізніше.');
      }
    });
  }

  private async sendSearchResults(ctx: any, articles: any[], query: string) {
    const message = `🔍 *Знайшов ${articles.length} статей за запитом: "${query}"*\n\n`;
    
    let text = message;

    for (let i = 0; i < Math.min(articles.length, 3); i++) {
      const article = articles[i];
      text += `${i + 1}. *${article.title}*\n`;
      text += `📅 ${article.date} • ⏱ ${article.readTime}\n`;
      text += `📝 ${article.excerpt}\n`;
      text += `🌐 Читати: ${this.frontendUrl}/article/${article.id}\n\n`;
    }

    if (articles.length > 3) {
      text += `\n_Показано 3 з ${articles.length} статей. Уточніть пошук для більш точних результатів._`;
    }

    text += `\n❓ *Не знайшли потрібну інформацію?* Напишіть "запитати лікаря"`;

    await ctx.replyWithMarkdown(text);
  }

  private async askDoctorQuestion(ctx: any) {
    const message = `
❓ *Запитати у лікаря*

Якщо ви не знайшли потрібну інформацію в статтях, можете задати персональне питання доктору Руслані Москаленко.

📝 *Напишіть ваше питання:*
• Опишіть симптоми або проблему
• Вкажіть ваші контактні дані (телефон, email)
• Додайте будь-яку додаткову інформацію

💬 *Приклад:*
"Добрий день! У мене тривалий кашель протягом 2 тижнів. Чи потрібно звернутися до лікаря? Мій телефон: +380123456789"

⏰ *Час відповіді:* 24-48 годин
    `;

    await ctx.replyWithMarkdown(message);

    // Set up question handler
    this.bot.on('text', async (questionCtx) => {
      if (questionCtx.message.text.startsWith('/')) return;
      
      const question = questionCtx.message.text;
      const user = questionCtx.from;
      
      // Send to doctor channel via bot2
      await this.sendQuestionToDoctor(user, question);
      
      await questionCtx.reply('✅ *Ваше питання відправлено лікарю!*\n\n⏰ Ви отримаєте відповідь протягом 24-48 годин.\n\n💡 А поки що можете переглянути корисні статті на сайті.');
    });
  }

  private async sendQuestionToDoctor(user: any, question: string) {
    // This will be handled by bot2 integration
    console.log('Question from user:', { user, question });
    // TODO: Send to doctor channel via bot2
  }

  public launch() {
    this.bot.launch();
    console.log('🤖 Simple Article Search Bot started');
  }

  public stop() {
    this.bot.stop();
  }
}
