import { applyDecorators, UseGuards } from '@nestjs/common';
import { OptionalAuthGuard } from '../guards/optional-auth.guard';

export const OptionalAuth = () => {
  return applyDecorators(UseGuards(OptionalAuthGuard));
};
