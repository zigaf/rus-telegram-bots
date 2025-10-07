import { Article, UserQuestion } from '../types';
export declare class ApiService {
    private baseURL;
    constructor(baseURL: string);
    getArticles(): Promise<Article[]>;
    searchArticles(query: string): Promise<Article[]>;
    getArticleById(id: number): Promise<Article | null>;
    sendContactMessage(message: {
        name: string;
        email: string;
        phone?: string;
        message: string;
    }): Promise<boolean>;
    private questions;
    saveQuestion(question: UserQuestion): Promise<string>;
    getQuestionById(id: string): Promise<UserQuestion | null>;
    updateQuestionStatus(id: string, status: 'pending' | 'answered' | 'archived'): Promise<boolean>;
    getPendingQuestions(): Promise<UserQuestion[]>;
}
//# sourceMappingURL=api.service.d.ts.map