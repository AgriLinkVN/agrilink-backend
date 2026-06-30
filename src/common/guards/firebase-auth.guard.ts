import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { DecodedIdToken } from "firebase-admin/auth";
import { Request } from "express";
import { FirebaseService } from "../../shared/firebase/firebase.service";

type FirebaseRequest = Request & {
  user?: DecodedIdToken;
  firebaseUser?: DecodedIdToken;
};

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FirebaseRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Firebase ID token missing");
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    if (!idToken) {
      throw new UnauthorizedException("Firebase ID token missing");
    }

    try {
      const decodedToken = await this.firebaseService.verifyIdToken(idToken);
      request.firebaseUser = decodedToken;
      request.user = decodedToken;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid Firebase ID token");
    }
  }
}
