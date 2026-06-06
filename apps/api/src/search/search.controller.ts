import { Controller, Get, Query } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Roles } from '../auth/decorators/roles.decorator'
import { JwtPayload } from '../auth/jwt.strategy'
import { SearchQueryDto } from './dto/search-query.dto'
import { SearchService } from './search.service'

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.TEAM_LEAD,
    UserRole.WORKER,
  )
  search(@CurrentUser() user: JwtPayload, @Query() query: SearchQueryDto) {
    return this.searchService.search(user, query.q)
  }
}
