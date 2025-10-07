export declare class SimpleDoctorQuestionsBot {
    private bot;
    private apiService;
    private doctorChannelId;
    constructor(token: string, apiBaseUrl: string, doctorChannelId: string);
    private setupHandlers;
    sendQuestionToDoctor(user: any, question: string, questionId: string): Promise<boolean>;
    private processIncomingQuestion;
    private formatUserInfo;
    launch(): void;
    stop(): void;
}
//# sourceMappingURL=simple-bot2.d.ts.map