// Types personnalisés pour Express Request avec authentification

import { AuthenticatedUser } from '../auth/auth.controller';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
