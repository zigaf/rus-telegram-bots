// Конфігурація ботів
export const BOT_CONFIG = {
  // Bot 1 - Пошук статей (нижній бот)
  BOT1_TOKEN: '7968078678:AAEVs4105R2rq4emfT7Qd2K7N5Go4XgDK3I',
  BOT1_USERNAME: 'moskalenko_helper_bot',

  // Bot 2 - Питання до лікаря (верхній бот)
  BOT2_TOKEN: '8441781301:AAGJEVkSSvBLR-j7qV2LskYnSBBSprOGQ5E',
  BOT2_USERNAME: 'ruslana_medical_bot',

  // Канал лікаря
  DOCTOR_CHANNEL_ID: '-1003176317968',
  DOCTOR_CHAT_ID: '-1003176317968',

  // API Configuration
  API_BASE_URL: process.env.API_BASE_URL || 'https://rus-production.up.railway.app/api',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://rus-production.up.railway.app',

  // Server
  PORT: process.env.PORT || 3002,
  NODE_ENV: process.env.NODE_ENV || 'development'
};
