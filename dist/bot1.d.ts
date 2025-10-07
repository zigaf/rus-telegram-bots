export declare class ArticleSearchBot {
    private bot;
    private apiService;
    private frontendUrl;
    constructor(token: string, apiBaseUrl: string, frontendUrl: string);
    private setupHandlers;
    private sendSearchResults;
    private showArticle;
    private showCategories;
    private showCategoryArticles;
    private askDoctorQuestion;
    private sendQuestionToDoctor;
    private getMainKeyboard;
    private getMainInlineKeyboard;
    private getNoResultsKeyboard;
    launch(): void;
    stop(): void;
}
//# sourceMappingURL=bot1.d.ts.map