import { Data } from "effect";
import { readFile } from "fs";

export default class Version extends Data.TaggedClass("Version")<{
  readonly version: string;
}> {
  static async create(): Promise<Version> {
    const packageJson = await new Promise<string>((resolve, reject) => {
      readFile("package.json", "utf8", (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    const parsedJson = JSON.parse(packageJson);
    const version = parsedJson.version;
    return new Version({ version });
  }
}
