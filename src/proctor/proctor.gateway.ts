import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';

export enum QuestionKind {
  Unknown,
  Radio,
}

export type Answer = string | {};

export type UserSession = {
  proctor?: {
    assessmentId: string;
    currentQuestionIndex: number;
  };
};

@WebSocketGateway(4001, { namespace: 'proctor', transports: 'websocket' })
export class ProctorGateway implements OnGatewayConnection {
  private db: { userId: string; assessmentId: string; answers: Answer[] }[] =
    [];
  private sessionStore: { [key: string]: UserSession } = {};
  private assessments: {
    id: string;
    questions: { text: string; kind: QuestionKind; options?: string[] }[];
  }[] = [
    {
      id: '123',
      questions: [
        {
          text: "Teresa is 46 inches tall. She is twice as tall as Lloyd. In the equation below, h represents Lloyd's height in inches.\n\n46 = 2h\n\nHow tall is Lloyd?",
          kind: QuestionKind.Radio,
          options: ['23 inches', '44 inches', '48 inches', '92 inches'],
        },
        {
          text: 'hello world',
          kind: QuestionKind.Radio,
          options: ['1', '2'],
        },
      ],
    },
  ];

  handleConnection(client: any, ...args: any[]) {
    this.sessionStore[client.id] = {};
  }

  @SubscribeMessage('start')
  handleStart(
    @ConnectedSocket() client: any,
    @MessageBody() { assessmentId }: { assessmentId: string },
  ): WsResponse<unknown> {
    this.sessionStore[client.id].proctor = {
      assessmentId,
      currentQuestionIndex: -1,
    };

    this.db = this.db.filter(
      (d) => d.userId !== client.id && d.assessmentId === assessmentId,
    );
    this.db.push({ userId: client.id, assessmentId, answers: [] });

    console.log(client.id, 'start', { assessmentId });
    return { event: 'start', data: undefined };
  }

  @SubscribeMessage('questions-count')
  handleQuestionsCount(@ConnectedSocket() client: any): WsResponse<unknown> {
    const assessmentId = this.sessionStore[client.id]?.proctor?.assessmentId;
    if (!assessmentId) throw new Error('no test in progress');

    const assessment = this.assessments.find((a) => a.id === assessmentId);
    if (!assessment) throw new Error('no assessment');

    console.log(client.id, 'questions-count');
    return { event: 'questions-count', data: assessment.questions.length };
  }

  @SubscribeMessage('go-to-question')
  handleGoToQuestion(
    @ConnectedSocket() client: any,
    @MessageBody() { index }: { index: number },
  ): WsResponse<unknown> {
    const assessmentId = this.sessionStore[client.id]?.proctor.assessmentId;
    if (!assessmentId) throw new Error('no test in progress');

    const assessment = this.assessments.find((a) => a.id === assessmentId);
    if (!assessment) throw new Error('no assessment');

    if (index < 0 || index >= assessment.questions.length)
      return { event: 'go-to-question', data: null };

    this.sessionStore[client.id].proctor.currentQuestionIndex = index;

    console.log(client.id, 'go-to-question', { index });
    return { event: 'go-to-question', data: assessment.questions[index] };
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: any,
    @MessageBody() { answer }: { answer: Answer },
  ): WsResponse<unknown> {
    const assessmentId = this.sessionStore[client.id]?.proctor.assessmentId;
    if (!assessmentId) throw new Error('no test in progress');

    const assessment = this.assessments.find((a) => a.id === assessmentId);
    if (!assessment) throw new Error('no assessment');

    const doc = this.db.find(
      (r) => r.assessmentId === assessmentId && r.userId === client.id,
    );
    if (!doc) throw new Error('no doc');

    doc.answers[this.sessionStore[client.id].proctor.currentQuestionIndex] =
      answer;

    console.log(client.id, 'answer', { answer });
    return { event: 'answer', data: undefined };
  }

  @SubscribeMessage('finish')
  handleFinish(@ConnectedSocket() client: any): WsResponse<unknown> {
    const assessmentId = this.sessionStore[client.id]?.proctor?.assessmentId;
    if (!assessmentId) throw new Error('no test in progress');

    const assessment = this.assessments.find((a) => a.id === assessmentId);
    if (!assessment) throw new Error('no assessment');

    console.log(
      this.db.find(
        (d) => d.userId === client.id && d.assessmentId === assessmentId,
      ),
    );
    delete this.sessionStore[client.id].proctor;

    console.log(client.id, 'finished');
    return { event: 'finish', data: undefined };
  }
}
