import { Telegraf, Markup } from 'telegraf';
import { ApiService } from './services/api.service';
import { Article } from './types';

export class ArticleSearchBot {
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
• Використовуйте кнопки нижче для швидкого доступу
• Якщо не знайшли потрібну інформацію - натисніть "Запитати у лікаря"

_Лікар-онколог Руслана Москаленко спеціалізується на торакальній хірургії та онкології легень._
      `;

      ctx.replyWithMarkdown(welcomeMessage, this.getMainKeyboard());
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
• Натисніть "Запитати у лікаря"
• Ваше питання буде передано доктору
• Ви отримаєте персональну відповідь

🌐 *Повна інформація на сайті:*
${this.frontendUrl}
      `;

      ctx.replyWithMarkdown(helpMessage, this.getMainKeyboard());
    });

    // Text messages - search articles
    this.bot.on('text', async (ctx) => {
      const query = ctx.message.text;
      
      if (query === '🔍 Пошук статей' || query === '📋 Категорії' || query === '❓ Запитати у лікаря') {
        return; // Handle these in callback queries
      }

      await ctx.reply('🔍 Шукаю інформацію...', { reply_markup: { remove_keyboard: true } });

      try {
        const articles = await this.apiService.searchArticles(query);
        
        if (articles.length === 0) {
          const noResultsMessage = `
😔 *Не знайшов статей за запитом: "${query}"*

💡 *Спробуйте:*
• Використати інші ключові слова
• Переглянути категорії статей
• Запитати у лікаря персонально

❓ *Запитати у лікаря* - отримайте персональну консультацію
          `;

          ctx.replyWithMarkdown(noResultsMessage, this.getNoResultsKeyboard());
        } else {
          await this.sendSearchResults(ctx, articles, query);
        }
      } catch (error) {
        console.error('Search error:', error);
        ctx.reply('❌ Помилка при пошуку. Спробуйте пізніше.', this.getMainKeyboard());
      }
    });

    // Callback queries
    this.bot.action(/^article_(\d+)$/, async (ctx) => {
      const articleId = parseInt(ctx.match[1]);
      await this.showArticle(ctx, articleId);
    });

    this.bot.action('search_articles', (ctx) => {
      ctx.reply('🔍 Напишіть ключові слова для пошуку статей:', { reply_markup: { remove_keyboard: true } });
    });

    this.bot.action('categories', async (ctx) => {
      await this.showCategories(ctx);
    });

    this.bot.action(/^category_(.+)$/, async (ctx) => {
      const category = ctx.match[1];
      await this.showCategoryArticles(ctx, category);
    });

    this.bot.action('ask_doctor', async (ctx) => {
      await this.askDoctorQuestion(ctx);
    });

    this.bot.action('back_to_main', (ctx) => {
      ctx.editMessageText('🏥 *Медичний бот Руслани Москаленко*', {
        parse_mode: 'Markdown',
        reply_markup: this.getMainInlineKeyboard()
      });
    });
  }

  private async sendSearchResults(ctx: any, articles: Article[], query: string) {
    const message = `🔍 *Знайшов ${articles.length} статей за запитом: "${query}"*\n\n`;
    
    let text = message;
    const keyboard = [];

    for (let i = 0; i < Math.min(articles.length, 5); i++) {
      const article = articles[i];
      text += `${i + 1}. *${article.title}*\n`;
      text += `📅 ${article.date} • ⏱ ${article.readTime}\n`;
      text += `📝 ${article.excerpt}\n\n`;
      
      keyboard.push([Markup.button.callback(`📖 ${article.title}`, `article_${article.id}`)]);
    }

    if (articles.length > 5) {
      text += `\n_Показано 5 з ${articles.length} статей. Уточніть пошук для більш точних результатів._`;
    }

    keyboard.push([Markup.button.callback('❓ Запитати у лікаря', 'ask_doctor')]);
    keyboard.push([Markup.button.callback('🔙 Назад', 'back_to_main')]);

    await ctx.replyWithMarkdown(text, { reply_markup: { inline_keyboard: keyboard } });
  }

  private async showArticle(ctx: any, articleId: number) {
    try {
      const article = await this.apiService.getArticleById(articleId);
      
      if (!article) {
        await ctx.answerCbQuery('❌ Статтю не знайдено');
        return;
      }

      let text = `📖 *${article.title}*\n\n`;
      text += `📅 ${article.date} • ⏱ ${article.readTime}\n`;
      text += `🏷 Категорія: ${article.category}\n\n`;
      text += `📝 *Вступ:*\n${article.content.intro}\n\n`;

      if (article.content.sections.length > 0) {
        text += `📋 *Основні розділи:*\n`;
        article.content.sections.forEach((section, index) => {
          text += `${index + 1}. ${section.heading}\n`;
        });
      }

      text += `\n🌐 *Читати повну статтю на сайті:*\n${this.frontendUrl}/article/${article.id}`;

      const keyboard = [
        [Markup.button.url('🌐 Читати на сайті', `${this.frontendUrl}/article/${article.id}`)],
        [Markup.button.callback('❓ Запитати у лікаря', 'ask_doctor')],
        [Markup.button.callback('🔙 Назад до пошуку', 'back_to_main')]
      ];

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Error showing article:', error);
      await ctx.answerCbQuery('❌ Помилка при завантаженні статті');
    }
  }

  private async showCategories(ctx: any) {
    const categories = [
      { name: 'Діагностика', emoji: '🔍', desc: 'Методи діагностики раку легень' },
      { name: 'Лікування', emoji: '💊', desc: 'Сучасні методи лікування' },
      { name: 'Профілактика', emoji: '🛡', desc: 'Профілактика захворювань' },
      { name: 'Хірургія', emoji: '⚕️', desc: 'Хірургічні процедури' },
      { name: 'Інновації', emoji: '🚀', desc: 'Новітні технології' },
      { name: 'Реабілітація', emoji: '🏥', desc: 'Відновлення після лікування' }
    ];

    let text = '📋 *Категорії статей:*\n\n';
    const keyboard = [];

    for (const category of categories) {
      text += `${category.emoji} *${category.name}*\n${category.desc}\n\n`;
      keyboard.push([Markup.button.callback(`${category.emoji} ${category.name}`, `category_${category.name}`)]);
    }

    keyboard.push([Markup.button.callback('🔙 Назад', 'back_to_main')]);

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  private async showCategoryArticles(ctx: any, category: string) {
    try {
      const articles = await this.apiService.getArticles();
      const categoryArticles = articles.filter(article => article.category === category);

      if (categoryArticles.length === 0) {
        await ctx.editMessageText(`😔 *В категорії "${category}" поки немає статей.*`, {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔙 Назад до категорій', 'categories')]
          ])
        });
        return;
      }

      let text = `📋 *Категорія: ${category}*\n\n`;
      const keyboard = [];

      for (const article of categoryArticles.slice(0, 5)) {
        text += `📖 *${article.title}*\n`;
        text += `📅 ${article.date} • ⏱ ${article.readTime}\n\n`;
        
        keyboard.push([Markup.button.callback(`📖 ${article.title}`, `article_${article.id}`)]);
      }

      keyboard.push([Markup.button.callback('🔙 Назад до категорій', 'categories')]);

      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Error showing category articles:', error);
      await ctx.answerCbQuery('❌ Помилка при завантаженні статей');
    }
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

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Назад', 'back_to_main')]
      ])
    });

    // Set up question handler
    this.bot.on('text', async (questionCtx) => {
      if (questionCtx.message.text.startsWith('/')) return;
      
      const question = questionCtx.message.text;
      const user = questionCtx.from;
      
      // Send to doctor channel via bot2
      await this.sendQuestionToDoctor(user, question);
      
      await questionCtx.reply('✅ *Ваше питання відправлено лікарю!*\n\n⏰ Ви отримаєте відповідь протягом 24-48 годин.\n\n💡 А поки що можете переглянути корисні статті:', {
        parse_mode: 'Markdown',
        reply_markup: this.getMainInlineKeyboard()
      });
    });
  }

  private async sendQuestionToDoctor(user: any, question: string) {
    // This will be handled by bot2 integration
    console.log('Question from user:', { user, question });
    // TODO: Send to doctor channel via bot2
  }

  private getMainKeyboard() {
    return Markup.keyboard([
      ['🔍 Пошук статей', '📋 Категорії'],
      ['❓ Запитати у лікаря']
    ]).resize();
  }

  private getMainInlineKeyboard() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🔍 Пошук статей', 'search_articles')],
      [Markup.button.callback('📋 Категорії', 'categories')],
      [Markup.button.callback('❓ Запитати у лікаря', 'ask_doctor')]
    ]);
  }

  private getNoResultsKeyboard() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🔍 Спробувати інший пошук', 'search_articles')],
      [Markup.button.callback('📋 Переглянути категорії', 'categories')],
      [Markup.button.callback('❓ Запитати у лікаря', 'ask_doctor')]
    ]);
  }

  public launch() {
    this.bot.launch();
    console.log('🤖 Article Search Bot started');
  }

  public stop() {
    this.bot.stop();
  }
}
