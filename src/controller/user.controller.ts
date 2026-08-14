import { Inject, Controller, Post, Body } from '@midwayjs/core';
import { ApiOkResponse, ApiTags } from '@midwayjs/swagger';
import { ErrorCode, CustomError } from '../common/error';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@midwayjs/jwt';
/** entity */
import { User } from '../entity/user.entity';
/** dto */
import { ResponseDto } from '../dto/common.dto';
import { RegisterDTO } from '../dto/user/register.dto';
import { LoginReqDTO, LoginResDTO, LoginUserDto } from '../dto/user/login.dto';

@Controller('/user')
@ApiTags(['user'])
export class UserController {
  @InjectEntityModel(User)
  private readonly userModel: Repository<User>;

  @Inject()
  private readonly jwtService: JwtService;

  @Post('/register')
  @ApiOkResponse({ type: ResponseDto })
  async regester(@Body() data: RegisterDTO) {
    const user = await this.userModel.findOne({ where: { name: data.name } });
    if (user) {
      throw new CustomError(ErrorCode.UserAlreadyExist);
    }
    const newUser = new User();
    newUser.password = data.password;
    newUser.name = data.name;
    await this.userModel.save(newUser);
  }

  @Post('/login')
  @ApiOkResponse({ type: LoginResDTO })
  async login(@Body() data: LoginReqDTO) {
    const user = await this.userModel.findOne({ where: { name: data.email } });
    if (!user) {
      throw new CustomError(ErrorCode.UserNotExist);
    }
    if (user.password !== data.password) {
      throw new CustomError(ErrorCode.PasswordError);
    }

    const token = this.jwtService.signSync({ uid: user.id, name: user.name });
    const res: LoginUserDto = {
      token,
      user: {
        uid: user.id,
        name: user.name,
      },
    };

    return res;
  }
}
