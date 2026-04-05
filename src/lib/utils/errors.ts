export class MidMintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MidMintError";
  }
}
