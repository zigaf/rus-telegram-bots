import axios from 'axios';
import { Article, UserQuestion } from '../types';

export class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // Articles
  async getArticles(): Promise<Article[]> {
    try {
      const response = await axios.get(`${this.baseURL}/articles`);
      return response.data;
    } catch (error) {
      console.error('Error fetching articles:', error);
      return [];
    }
  }

  async searchArticles(query: string): Promise<Article[]> {
    try {
      const articles = await this.getArticles();
      const searchQuery = query.toLowerCase();
      
      return articles.filter(article => 
        article.title.toLowerCase().includes(searchQuery) ||
        article.excerpt.toLowerCase().includes(searchQuery) ||
        article.category.toLowerCase().includes(searchQuery) ||
        article.content.intro.toLowerCase().includes(searchQuery) ||
        article.content.sections.some(section => 
          section.heading.toLowerCase().includes(searchQuery) ||
          section.text.toLowerCase().includes(searchQuery)
        )
      );
    } catch (error) {
      console.error('Error searching articles:', error);
      return [];
    }
  }

  async getArticleById(id: number): Promise<Article | null> {
    try {
      const response = await axios.get(`${this.baseURL}/articles/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching article:', error);
      return null;
    }
  }

  // Contact messages
  async sendContactMessage(message: {
    name: string;
    email: string;
    phone?: string;
    message: string;
  }): Promise<boolean> {
    try {
      await axios.post(`${this.baseURL}/contact`, message);
      return true;
    } catch (error) {
      console.error('Error sending contact message:', error);
      return false;
    }
  }

  // Questions storage (local for now, can be moved to database later)
  private questions: UserQuestion[] = [];

  async saveQuestion(question: UserQuestion): Promise<string> {
    const id = Date.now().toString();
    question.id = id;
    question.timestamp = new Date();
    question.status = 'pending';
    
    this.questions.push(question);
    return id;
  }

  async getQuestionById(id: string): Promise<UserQuestion | null> {
    return this.questions.find(q => q.id === id) || null;
  }

  async updateQuestionStatus(id: string, status: 'pending' | 'answered' | 'archived'): Promise<boolean> {
    const question = this.questions.find(q => q.id === id);
    if (question) {
      question.status = status;
      return true;
    }
    return false;
  }

  async getPendingQuestions(): Promise<UserQuestion[]> {
    return this.questions.filter(q => q.status === 'pending');
  }
}
