# Telegram Bots for Dr. Ruslana Moskalenko

Цей проект містить два Telegram боти для медичного сайту лікаря Руслани Москаленко.

## 🤖 Боти

### Bot 1: Article Search Bot (@moskalenko_helper_bot)
- **Функція**: Допомагає пацієнтам знайти корисну інформацію на сайті
- **Команди**: `/start`, `/help`
- **Функціонал**: Пошук статей, перенаправлення питань до лікаря

### Bot 2: Doctor Questions Bot (@ruslana_medical_bot)
- **Функція**: Передає питання пацієнтів до лікаря через канал
- **Канал**: RUSLANKA (-1003176317968)
- **Функціонал**: Автоматична відправка питань в канал лікаря

## 🚀 Деплой на Railway

### Змінні середовища:
```
BOT1_TOKEN=7968078678:AAEVs4105R2rq4emfT7Qd2K7N5Go4XgDK3I
BOT2_TOKEN=8441781301:AAGJEVkSSvBLR-j7qV2LskYnSBBSprOGQ5E
DOCTOR_CHANNEL_ID=-1003176317968
```

### Локальний запуск:
```bash
npm install
node start-bots.js
```

## 📁 Структура проекту

```
telegram-bots/
├── start-bots.js          # Основний файл для запуску ботів
├── config.ts              # Конфігурація ботів
├── src/
│   ├── bot1.ts           # Bot 1 (Article Search)
│   ├── bot2.ts           # Bot 2 (Doctor Questions)
│   ├── types.ts          # TypeScript типи
│   └── services/
│       └── api.service.ts # API сервіс для роботи з сайтом
├── railway.json          # Конфігурація Railway
├── nixpacks.toml         # Конфігурація Nixpacks
└── package.json          # Залежності
```

## 🔧 Технології

- **Node.js** - Runtime
- **Telegraf.js** - Telegram Bot API
- **TypeScript** - Типізація
- **Railway** - Хостинг

## 📞 Підтримка

При проблемах з ботами звертайтеся до адміністратора сайту.