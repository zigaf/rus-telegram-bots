import { Telegraf, Markup, Context } from 'telegraf';
import { Booking } from './types';

interface SessionData {
  step?: 'date' | 'time' | 'people';
  tempBooking?: Partial<Booking>;
  selectedDate?: string;
  selectedTime?: string;
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


    // Обработчики для выбора даты
    this.bot.action(/^select_date_(.+)$/, async (ctx) => {
      const date = ctx.match[1];
      await this.handleDateSelection(ctx, date);
    });

    // Обработчики для выбора времени
    this.bot.action(/^select_time_(.+)$/, async (ctx) => {
      const time = ctx.match[1];
      await this.handleTimeSelection(ctx, time);
    });

    // Обработчики для выбора количества человек
    this.bot.action(/^select_people_(\d+)$/, async (ctx) => {
      const people = parseInt(ctx.match[1]);
      await this.handlePeopleSelection(ctx, people);
    });

    // Text messages - теперь не нужны, все через кнопки
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

    await this.showDateSelection(ctx);
  }

  private async showDateSelection(ctx: any) {
    const today = new Date();
    const dates = [];
    
    // Генерируем даты на следующие 14 дней
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      dates.push(dateStr);
    }

    const keyboard = [];
    for (let i = 0; i < dates.length; i += 2) {
      const row = [];
      row.push(Markup.button.callback(dates[i], `select_date_${dates[i]}`));
      if (dates[i + 1]) {
        row.push(Markup.button.callback(dates[i + 1], `select_date_${dates[i + 1]}`));
      }
      keyboard.push(row);
    }

    keyboard.push([Markup.button.callback('❌ Отмена', 'back_to_main')]);

    await ctx.editMessageText(
      '📅 *Шаг 1 из 4: Выберите дату*\n\n' +
      'Выберите дату для бронирования:',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  }

  private async handleDateSelection(ctx: any, date: string) {
    const userId = ctx.from.id;
    const session = this.sessions.get(userId);
    
    if (session) {
      session.tempBooking!.date = date;
      session.selectedDate = date;
      session.step = 'time';
      await this.showTimeSelection(ctx);
    }
  }

  private async showTimeSelection(ctx: any) {
    const times = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
      '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
      '21:00', '21:30', '22:00'
    ];

    const keyboard = [];
    for (let i = 0; i < times.length; i += 3) {
      const row = [];
      row.push(Markup.button.callback(times[i], `select_time_${times[i]}`));
      if (times[i + 1]) row.push(Markup.button.callback(times[i + 1], `select_time_${times[i + 1]}`));
      if (times[i + 2]) row.push(Markup.button.callback(times[i + 2], `select_time_${times[i + 2]}`));
      keyboard.push(row);
    }

    keyboard.push([Markup.button.callback('❌ Отмена', 'back_to_main')]);

    await ctx.editMessageText(
      '🕐 *Шаг 2 из 3: Выберите время*\n\n' +
      'Выберите время для бронирования:',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  }

  private async handleTimeSelection(ctx: any, time: string) {
    const userId = ctx.from.id;
    const session = this.sessions.get(userId);
    
    if (session) {
      session.tempBooking!.time = time;
      session.selectedTime = time;
      session.step = 'people';
      await this.showPeopleSelection(ctx);
    }
  }

  private async showPeopleSelection(ctx: any) {
    const peopleCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];

    const keyboard = [];
    for (let i = 0; i < peopleCounts.length; i += 3) {
      const row = [];
      row.push(Markup.button.callback(`${peopleCounts[i]} чел.`, `select_people_${peopleCounts[i]}`));
      if (peopleCounts[i + 1]) row.push(Markup.button.callback(`${peopleCounts[i + 1]} чел.`, `select_people_${peopleCounts[i + 1]}`));
      if (peopleCounts[i + 2]) row.push(Markup.button.callback(`${peopleCounts[i + 2]} чел.`, `select_people_${peopleCounts[i + 2]}`));
      keyboard.push(row);
    }

    keyboard.push([Markup.button.callback('❌ Отмена', 'back_to_main')]);

    await ctx.editMessageText(
      '👥 *Шаг 3 из 3: Количество человек*\n\n' +
      'Выберите количество человек:',
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      }
    );
  }

  private async handlePeopleSelection(ctx: any, people: number) {
    const userId = ctx.from.id;
    const session = this.sessions.get(userId);
    
    if (session) {
      session.tempBooking!.numberOfPeople = people;
      await this.completeBooking(ctx, session);
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

// Запуск бота, если файл запущен напрямую
if (require.main === module) {
  import('dotenv').then(dotenv => {
    dotenv.config();
    
    const BOT3_TOKEN = process.env.BOT3_TOKEN || '8455993287:AAEq_qVaOke4wzaQaxqXVuAmvjMixLEC-Fk';
    
    if (!BOT3_TOKEN) {
      console.error('❌ BOT3_TOKEN is required');
      process.exit(1);
    }
    
    const bot = new BookingBot(BOT3_TOKEN);
    bot.launch();
    
    console.log('🚀 Bot3 (Table Booking) started successfully!');
    console.log(`🍽 Bot 3 (Table Booking): @table_booking_bot`);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Bot3...');
      bot.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down Bot3...');
      bot.stop();
      process.exit(0);
    });
  });
}