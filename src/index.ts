import dotenv from 'dotenv';
import { ArticleSearchBot } from './bot1';
import { DoctorQuestionsBot } from './bot2';
import { BookingBot } from './bot3';
import { BOT_CONFIG } from '../config';

// Load environment variables
dotenv.config();

const PORT = BOT_CONFIG.PORT;

// Bot configurations
const BOT1_TOKEN = process.env.BOT1_TOKEN || BOT_CONFIG.BOT1_TOKEN;
const BOT2_TOKEN = process.env.BOT2_TOKEN || BOT_CONFIG.BOT2_TOKEN;
const BOT3_TOKEN = process.env.BOT3_TOKEN || BOT_CONFIG.BOT3_TOKEN;
const API_BASE_URL = BOT_CONFIG.API_BASE_URL;
const FRONTEND_URL = BOT_CONFIG.FRONTEND_URL;
const DOCTOR_CHANNEL_ID = process.env.DOCTOR_CHANNEL_ID || BOT_CONFIG.DOCTOR_CHANNEL_ID;
const DOCTOR_CHAT_ID = process.env.DOCTOR_CHAT_ID || BOT_CONFIG.DOCTOR_CHAT_ID;

// Validate required environment variables
if (!BOT1_TOKEN) {
  console.error('❌ BOT1_TOKEN is required');
  process.exit(1);
}

if (!BOT2_TOKEN) {
  console.error('❌ BOT2_TOKEN is required');
  process.exit(1);
}

if (!BOT3_TOKEN) {
  console.error('❌ BOT3_TOKEN is required');
  process.exit(1);
}

if (!DOCTOR_CHANNEL_ID) {
  console.error('❌ DOCTOR_CHANNEL_ID is required');
  process.exit(1);
}

// Initialize bots
let bot1: ArticleSearchBot;
let bot2: DoctorQuestionsBot;
let bot3: BookingBot;

try {
  // Initialize Article Search Bot (Bot 1)
  bot1 = new ArticleSearchBot(BOT1_TOKEN, API_BASE_URL, FRONTEND_URL);
  
  // Initialize Doctor Questions Bot (Bot 2)
  bot2 = new DoctorQuestionsBot(BOT2_TOKEN, API_BASE_URL, DOCTOR_CHANNEL_ID, DOCTOR_CHAT_ID || DOCTOR_CHANNEL_ID);

  // Initialize Booking Bot (Bot 3)
  bot3 = new BookingBot(BOT3_TOKEN);

  // Connect bots - bot1 sends questions to bot2
  bot1['sendQuestionToDoctor'] = async (user: any, question: string) => {
    const questionId = Date.now().toString();
    
    // Save question to storage
    await bot2['apiService'].saveQuestion({
      id: questionId,
      userId: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      question: question,
      timestamp: new Date(),
      status: 'pending'
    });

    // Send to doctor via bot2
    await bot2.sendQuestionToDoctor(user, question, questionId);
  };

  // Launch bots
  bot1.launch();
  bot2.launch();
  bot3.launch();

  console.log('🚀 Telegram bots started successfully!');
  console.log(`📱 Bot 1 (Article Search): @${process.env.BOT1_USERNAME || 'rus_medical_info_bot'}`);
  console.log(`👩‍⚕️ Bot 2 (Doctor Questions): @${process.env.BOT2_USERNAME || 'rus_medical_questions_bot'}`);
  console.log(`🍽 Bot 3 (Table Booking): @${BOT_CONFIG.BOT3_USERNAME}`);
  console.log(`📺 Doctor Channel: ${DOCTOR_CHANNEL_ID}`);
  console.log(`🌐 API URL: ${API_BASE_URL}`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);

} catch (error) {
  console.error('❌ Error starting bots:', error);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bots...');
  bot1?.stop();
  bot2?.stop();
  bot3?.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bots...');
  bot1?.stop();
  bot2?.stop();
  bot3?.stop();
  process.exit(0);
});

// Health check endpoint
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    bots: {
      bot1: 'running',
      bot2: 'running',
      bot3: 'running'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/stats', async (req, res) => {
  try {
    // Get basic stats
    const stats = {
      timestamp: new Date().toISOString(),
      bots: {
        bot1: {
          name: 'Article Search Bot',
          status: 'running',
          username: process.env.BOT1_USERNAME
        },
        bot2: {
          name: 'Doctor Questions Bot',
          status: 'running',
          username: process.env.BOT2_USERNAME
        },
        bot3: {
          name: 'Table Booking Bot',
          status: 'running',
          username: BOT_CONFIG.BOT3_USERNAME
        }
      },
      doctorChannel: DOCTOR_CHANNEL_ID,
      apiUrl: API_BASE_URL
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Health check server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Stats: http://localhost:${PORT}/stats`);
});
