export interface JwtPayload {
  sub: string;       // user id
  phone: string;
  role: string;
  iat?: number;
  exp?: number;
}
