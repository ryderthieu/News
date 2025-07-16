import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { JWT_SECRET } from "src/common/constrants/jwt.constant";
import { PrismaService } from "src/prisma/prisma.service";
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService){
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: JWT_SECRET,
        })
    }

    async validate(payload: {sub: number}) {
        const user = await this.prisma.user.findUnique({
            where: {id: payload.sub},
        })

        if (!user) throw new UnauthorizedException();

        return user;
    }
}
