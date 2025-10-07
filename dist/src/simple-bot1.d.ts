export declare class SimpleArticleSearchBot {
    private bot;
    private apiService;
    private frontendUrl;
    constructor(token: string, apiBaseUrl: string, frontendUrl: string);
    private setupHandlers;
    private sendSearchResults;
    private askDoctorQuestion;
    private sendQuestionToDoctor;
    launch(): void;
    stop(): void;
}
//# sourceMappingURL=simple-bot1.d.ts.map