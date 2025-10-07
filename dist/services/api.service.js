"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiService = void 0;
const axios_1 = __importDefault(require("axios"));
class ApiService {
    constructor(baseURL) {
        // Questions storage (local for now, can be moved to database later)
        this.questions = [];
        this.baseURL = baseURL;
    }
    // Articles
    async getArticles() {
        try {
            const response = await axios_1.default.get(`${this.baseURL}/articles`);
            return response.data;
        }
        catch (error) {
            console.error('Error fetching articles:', error);
            return [];
        }
    }
    async searchArticles(query) {
        try {
            const articles = await this.getArticles();
            const searchQuery = query.toLowerCase();
            return articles.filter(article => article.title.toLowerCase().includes(searchQuery) ||
                article.excerpt.toLowerCase().includes(searchQuery) ||
                article.category.toLowerCase().includes(searchQuery) ||
                article.content.intro.toLowerCase().includes(searchQuery) ||
                article.content.sections.some(section => section.heading.toLowerCase().includes(searchQuery) ||
                    section.text.toLowerCase().includes(searchQuery)));
        }
        catch (error) {
            console.error('Error searching articles:', error);
            return [];
        }
    }
    async getArticleById(id) {
        try {
            const response = await axios_1.default.get(`${this.baseURL}/articles/${id}`);
            return response.data;
        }
        catch (error) {
            console.error('Error fetching article:', error);
            return null;
        }
    }
    // Contact messages
    async sendContactMessage(message) {
        try {
            await axios_1.default.post(`${this.baseURL}/contact`, message);
            return true;
        }
        catch (error) {
            console.error('Error sending contact message:', error);
            return false;
        }
    }
    async saveQuestion(question) {
        const id = Date.now().toString();
        question.id = id;
        question.timestamp = new Date();
        question.status = 'pending';
        this.questions.push(question);
        return id;
    }
    async getQuestionById(id) {
        return this.questions.find(q => q.id === id) || null;
    }
    async updateQuestionStatus(id, status) {
        const question = this.questions.find(q => q.id === id);
        if (question) {
            question.status = status;
            return true;
        }
        return false;
    }
    async getPendingQuestions() {
        return this.questions.filter(q => q.status === 'pending');
    }
}
exports.ApiService = ApiService;
