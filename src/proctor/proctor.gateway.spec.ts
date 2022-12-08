import { Test, TestingModule } from '@nestjs/testing';
import { ProctorGateway } from './proctor.gateway';

describe('ProctorGateway', () => {
  let gateway: ProctorGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProctorGateway],
    }).compile();

    gateway = module.get<ProctorGateway>(ProctorGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
