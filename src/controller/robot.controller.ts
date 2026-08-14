import { Inject, Controller, Post } from '@midwayjs/core';
import { ApiOkResponse, ApiTags } from '@midwayjs/swagger';
import { RobotListResDto } from '../dto/robot/list.dto';
import { RobotService } from '../service/robot.service';

@Controller('/robot')
@ApiTags(['robot'])
export class RobotController {
  @Inject()
  private readonly robotService: RobotService;

  @Post('/list')
  @ApiOkResponse({ type: RobotListResDto })
  async list() {
    const robots = await this.robotService.listRobots();
    return {
      list: robots.map(r => ({
        id: r.id,
        name: r.name,
        personality: r.personality,
      })),
    };
  }
}
