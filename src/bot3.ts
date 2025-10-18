import { Telegraf, Markup, Context } from 'telegraf';
import { Booking } from './types';

interface SessionData {
  step?: 'date' | 'time' | 'people' | 'phone';
  tempBooking?: Partial<Booking>;
}

export class BookingBot {
  private bot: Telegraf;
  private bookings: Map<string, Booking[]> = new Map();
  private sessions: Map<number, SessionData> = new Map();

  constructor(token: string) {
    this.bot = new Telegraf(token);
    this.setupHandlers();
  }

  private setupHandlers() {
    // Start command - показывает брони и кнопку добавить
    this.bot.start((ctx) => {
      this.showMainMenu(ctx);
    });

    // Callback queries
    this.bot.action('add_booking', async (ctx) => {
      await this.startBookingProcess(ctx);
    });

    this.bot.action('view_bookings', async (ctx) => {
      await this.showBookings(ctx);
    });

    this.bot.action(/^cancel_booking_(.+)$/, async (ctx) => {
      const bookingId = ctx.match[1];
      await this.cancelBooking(ctx, bookingId);
    });

    this.bot.action('back_to_main', async (ctx) => {
      await this.showMainMenu(ctx);
    });

    this.bot.action('skip_phone', async (ctx) => {
      const userId = ctx.from.id;
      const session = this.sessions.get(userId);
      if (session) {
        await this.completeBooking(ctx, session);
      }
    });

    // Text messages - обработка ввода данных для бронирования
    this.bot.on('text', async (ctx) => {
      const userId = ctx.from.id;
      const session = this.sessions.get(userId);

      if (!session || !session.step) {
        return;
      }

      await this.handleBookingInput(ctx, session);
    });
  }

  private async showMainMenu(ctx: any) {
    const userId = ctx.from.id;
    const userBookings = this.getUserBookings(userId);

    let message = '🍽 *Система бронирования столов*\n\n';

    if (userBookings.length > 0) {
      message += `📋 У вас *${userBookings.length}* активных броней\n\n`;
      message += '🔍 *Ваши брони:*\n';
      userBookings.forEach((booking, index) => {
        message += `${index + 1}. 📅 ${booking.date} в ${booking.time}\n`;
        message += `   👥 ${booking.numberOfPeople} чел.\n`;
      });
      message += '\n';
    } else {
      message += '📝 У вас пока нет активных броней\n\n';
    }

    message += 'Выберите действие:';

    const keyboard = [
      [Markup.button.callback('➕ Добавить бронь', 'add_booking')],
    ];

    if (userBookings.length > 0) {
      keyboard.push([Markup.button.callback('📋 Просмотреть брони', 'view_bookings')]);
    }

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      await ctx.replyWithMarkdown(message, {
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  }

  private async startBookingProcess(ctx: any) {
    const userId = ctx.from.id;
    
    this.sessions.set(userId, {
      step: 'date',
      tempBooking: {
        userId,
        username: ctx.from.username,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        status: 'pending'
      }
    });

    await ctx.editMessageText(
      '📅 *Шаг 1 из 4: Дата бронирования*\n\n' +
      'Введите дату в формате ДД.ММ.ГГГГ\n' +
      'Например: 25.10.2025',
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('❌ Отмена', 'back_to_main')]
        ])
      }
    );
  }

  private async handleBookingInput(ctx: any, session: SessionData) {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();

    switch (session.step) {
      case 'date':
        if (this.validateDate(text)) {
          session.tempBooking!.date = text;
          session.step = 'time';
          await ctx.reply(
            '🕐 *Шаг 2 из 4: Время бронирования*\n\n' +
            'Введите время в формате ЧЧ:ММ\n' +
            'Например: 19:30',
            {
              parse_mode: 'Markdown',
              reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('❌ Отмена', 'back_to_main')]
              ])
            }
          );
        } else {
          await ctx.reply('❌ Неверный формат даты. Используйте формат ДД.ММ.ГГГГ (например: 25.10.2025)');
        }
        break;

      case 'time':
        if (this.validateTime(text)) {
          session.tempBooking!.time = text;
          session.step = 'people';
          await ctx.reply(
            '👥 *Шаг 3 из 4: Количество человек*\n\n' +
            'Введите количество человек (от 1 до 20)\n' +
            'Например: 4',
            {
              parse_mode: 'Markdown',
              reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('❌ Отмена', 'back_to_main')]
              ])
            }
          );
        } else {
          await ctx.reply('❌ Неверный формат времени. Используйте формат ЧЧ:ММ (например: 19:30)');
        }
        break;

      case 'people':
        const numberOfPeople = parseInt(text);
        if (!isNaN(numberOfPeople) && numberOfPeople >= 1 && numberOfPeople <= 20) {
          session.tempBooking!.numberOfPeople = numberOfPeople;
          session.step = 'phone';
          await ctx.reply(
            '📱 *Шаг 4 из 4: Контактный телефон*\n\n' +
            'Введите ваш номер телефона\n' +
            'Например: +380123456789\n\n' +
            'Или введите "пропустить" если не хотите указывать',
            {
              parse_mode: 'Markdown',
              reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback('⏭ Пропустить', 'skip_phone')],
                [Markup.button.callback('❌ Отмена', 'back_to_main')]
              ])
            }
          );
        } else {
          await ctx.reply('❌ Введите корректное число от 1 до 20');
        }
        break;

      case 'phone':
        if (text.toLowerCase() === 'пропустить') {
          await this.completeBooking(ctx, session);
        } else if (this.validatePhone(text)) {
          session.tempBooking!.phoneNumber = text;
          await this.completeBooking(ctx, session);
        } else {
          await ctx.reply('❌ Неверный формат телефона. Введите номер в формате +380XXXXXXXXX или "пропустить"');
        }
        break;
    }
  }

  private async completeBooking(ctx: any, session: SessionData) {
    const userId = ctx.from.id;
    const booking: Booking = {
      id: this.generateBookingId(),
      ...session.tempBooking as any,
      createdAt: new Date(),
      status: 'confirmed'
    };

    // Сохраняем бронь
    const userBookings = this.bookings.get(userId.toString()) || [];
    userBookings.push(booking);
    this.bookings.set(userId.toString(), userBookings);

    // Очищаем сессию
    this.sessions.delete(userId);

    // Показываем подтверждение
    const confirmMessage = 
      '✅ *Бронь успешно создана!*\n\n' +
      '📋 *Детали бронирования:*\n' +
      `📅 Дата: ${booking.date}\n` +
      `🕐 Время: ${booking.time}\n` +
      `👥 Количество человек: ${booking.numberOfPeople}\n` +
      (booking.phoneNumber ? `📱 Телефон: ${booking.phoneNumber}\n` : '') +
      `\n🆔 Номер брони: ${booking.id}\n\n` +
      '💡 Вы можете просмотреть или отменить бронь в главном меню';

    await ctx.reply(confirmMessage, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
      ])
    });
  }

  private async showBookings(ctx: any) {
    const userId = ctx.from.id;
    const userBookings = this.getUserBookings(userId);

    if (userBookings.length === 0) {
      await ctx.editMessageText('📝 У вас нет активных броней', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('➕ Добавить бронь', 'add_booking')],
          [Markup.button.callback('🏠 Главное меню', 'back_to_main')]
        ])
      });
      return;
    }

    let message = '📋 *Ваши брони:*\n\n';

    const keyboard: any[] = [];
    userBookings.forEach((booking, index) => {
      message += `${index + 1}. *Бронь #${booking.id}*\n`;
      message += `📅 ${booking.date} в ${booking.time}\n`;
      message += `👥 ${booking.numberOfPeople} человек\n`;
      if (booking.phoneNumber) {
        message += `📱 ${booking.phoneNumber}\n`;
      }
      message += `📊 Статус: ${this.getStatusEmoji(booking.status)} ${this.getStatusText(booking.status)}\n\n`;

      if (booking.status === 'confirmed' || booking.status === 'pending') {
        keyboard.push([Markup.button.callback(`❌ Отменить бронь #${booking.id}`, `cancel_booking_${booking.id}`)]);
      }
    });

    keyboard.push([Markup.button.callback('➕ Добавить еще', 'add_booking')]);
    keyboard.push([Markup.button.callback('🏠 Главное меню', 'back_to_main')]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  private async cancelBooking(ctx: any, bookingId: string) {
    const userId = ctx.from.id;
    const userBookings = this.bookings.get(userId.toString()) || [];
    
    const booking = userBookings.find(b => b.id === bookingId);
    if (booking) {
      booking.status = 'cancelled';
      this.bookings.set(userId.toString(), userBookings);

      await ctx.answerCbQuery('✅ Бронь отменена');
      await this.showBookings(ctx);
    } else {
      await ctx.answerCbQuery('❌ Бронь не найдена');
    }
  }

  private getUserBookings(userId: number): Booking[] {
    return (this.bookings.get(userId.toString()) || [])
      .filter(b => b.status !== 'cancelled');
  }

  private validateDate(date: string): boolean {
    const regex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!regex.test(date)) return false;

    const [day, month, year] = date.split('.').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    return dateObj.getFullYear() === year &&
           dateObj.getMonth() === month - 1 &&
           dateObj.getDate() === day &&
           dateObj >= new Date();
  }

  private validateTime(time: string): boolean {
    const regex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(time);
  }

  private validatePhone(phone: string): boolean {
    const regex = /^\+?[\d\s\-\(\)]{10,}$/;
    return regex.test(phone);
  }

  private generateBookingId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'confirmed': return '✅';
      case 'pending': return '⏳';
      case 'cancelled': return '❌';
      default: return '❓';
    }
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'confirmed': return 'Подтверждено';
      case 'pending': return 'Ожидание';
      case 'cancelled': return 'Отменено';
      default: return 'Неизвестно';
    }
  }

  public launch() {
    this.bot.launch();
    console.log('🤖 Booking Bot started');
  }

  public stop() {
    this.bot.stop();
  }
}