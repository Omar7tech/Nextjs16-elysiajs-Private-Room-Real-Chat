export class AuthErrors extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AuthErrors";
    }
}

export const authErrors = {
    roomNotFound: new AuthErrors("Room not found"),
    roomFull: new AuthErrors("Room is full"),
    tokenInvalid: new AuthErrors("Invalid token"),
    tokenExpired: new AuthErrors("Token expired"),
    tokenMissing: new AuthErrors("Token missing"),
    tokenAlreadyExists: new AuthErrors("Token already exists"),
    tokenNotProvided: new AuthErrors("Token not provided"),
    tokenNotValid: new AuthErrors("Token not valid"),
    tokenNotValidYet: new AuthErrors("Token not valid yet"),
    tokenSignatureInvalid: new AuthErrors("Token signature invalid"),
    tokenSignatureExpired: new AuthErrors("Token signature expired"),
    tokenSignatureMissing: new AuthErrors("Token signature missing"),
    tokenSignatureAlreadyExists: new AuthErrors("Token signature already exists"),
    tokenSignatureNotProvided: new AuthErrors("Token signature not provided"),
    tokenSignatureNotValid: new AuthErrors("Token signature not valid"),
    tokenSignatureNotValidYet: new AuthErrors("Token signature not valid yet"),
};

export const authMiddleware = () => {
    // TODO: Implement authentication logic here
    // For now, return an empty object
    return {};
};