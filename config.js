"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_CONFIG = void 0;
// Конфігурація ботів
exports.BOT_CONFIG = {
    // Bot 1 - Пошук статей
    BOT1_TOKEN: '7968078678:AAEVs4105R2rq4emfT7Qd2K7N5Go4XgDK3I',
    BOT1_USERNAME: 'rus_medical_info_bot',
    // Bot 2 - Питання до лікаря
    BOT2_TOKEN: '8441781301:AAGJEVkSSvBLR-j7qV2LskYnSBBSprOGQ5E',
    BOT2_USERNAME: 'rus_medical_questions_bot',
    // Канал лікаря (потрібно створити)
    DOCTOR_CHANNEL_ID: '@your_doctor_channel',
    DOCTOR_CHAT_ID: '-1001234567890',
    // API Configuration
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001/api',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4200',
    // Server
    PORT: process.env.PORT || 3002,
    NODE_ENV: process.env.NODE_ENV || 'development'
};
//# sourceMappingURL=config.js.map