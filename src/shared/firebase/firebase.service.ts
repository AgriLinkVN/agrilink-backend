import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { DecodedIdToken, getAuth } from "firebase-admin/auth";

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (getApps().length) {
      return;
    }

    const projectId = this.configService.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = this.configService.get<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = this.configService
      .get<string>("FIREBASE_PRIVATE_KEY")
      ?.replace(/\\n/g, "\n");

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      this.logger.log(
        "Firebase Admin initialized from environment credentials",
      );
      return;
    }

    initializeApp({
      credential: applicationDefault(),
    });
    this.logger.log(
      "Firebase Admin initialized with application default credentials",
    );
  }

  verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    return getAuth().verifyIdToken(idToken, true);
  }
}
