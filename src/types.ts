export interface Article {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  image?: string;
  content: {
    intro: string;
    sections: { heading: string; text: string; }[];
  };
  date: string;
  readTime: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserQuestion {
  id?: string;
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  question: string;
  contactInfo?: string;
  timestamp: Date;
  status: 'pending' | 'answered' | 'archived';
}

export interface BotUser {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  isBlocked: boolean;
  lastActivity: Date;
  questionsCount: number;
}

export interface SearchResult {
  articles: Article[];
  total: number;
  query: string;
}
