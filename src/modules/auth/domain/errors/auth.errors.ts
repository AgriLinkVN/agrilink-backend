export class InvalidCredentialsError extends Error {
  constructor(message: string = "Mật khẩu không chính xác") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

export class UserNotFoundError extends Error {
  constructor(message: string = "User not found") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

export class UserAlreadyExistsError extends Error {
  constructor(message: string = "Email already exists") {
    super(message);
    this.name = "UserAlreadyExistsError";
  }
}

export class InvalidTokenError extends Error {
  constructor(message: string = "Invalid token") {
    super(message);
    this.name = "InvalidTokenError";
  }
}

export class OtpLimitExceededError extends Error {
  constructor(message: string = "Too many OTP requests. Try again later.") {
    super(message);
    this.name = "OtpLimitExceededError";
  }
}

export class InvalidOtpError extends Error {
  constructor(message: string = "Invalid OTP") {
    super(message);
    this.name = "InvalidOtpError";
  }
}
