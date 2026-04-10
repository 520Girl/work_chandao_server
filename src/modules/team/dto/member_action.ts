import { Rule, RuleType } from '@midwayjs/validate';

export class AppTeamRemoveMemberDTO {
  @Rule(RuleType.number().required())
  teamId: number;

  @Rule(RuleType.number().required())
  userId: number;
}

