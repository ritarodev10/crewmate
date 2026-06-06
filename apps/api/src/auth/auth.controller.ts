import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { AuthService, LoginResponse } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RefreshDto } from './dto/refresh.dto'
import { Public } from './decorators/public.decorator'

interface ApiResponse<T> {
  data: T
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<ApiResponse<LoginResponse>> {
    const result = await this.authService.login(dto.email, dto.password)
    return { data: result }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): ApiResponse<{ accessToken: string }> {
    const accessToken = this.authService.refresh(dto.refreshToken)
    return { data: { accessToken } }
  }
}
