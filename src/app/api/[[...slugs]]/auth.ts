export class AuthErrors extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AuthErrors";
    }
}