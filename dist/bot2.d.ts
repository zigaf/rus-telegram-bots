export declare class DoctorQuestionsBot {
    private bot;
    private apiService;
    private doctorChannelId;
    private doctorChatId;
    constructor(token: string, apiBaseUrl: string, doctorChannelId: string, doctorChatId: string);
    private setupHandlers;
    sendQuestionToDoctor(user: any, question: string, questionId: string): Promise<boolean>;
    private processIncomingQuestion;
    private startAnswering;
    private sendAnswerToPatient;
    private archiveQuestion;
    private viewQuestionDetails;
    private formatUserInfo;
    launch(): void;
    stop(): void;
}
//# sourceMappingURL=bot2.d.ts.map