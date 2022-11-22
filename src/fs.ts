import { path } from "./deps.ts";

export async function* enumerateFiles(
  directoryPath: string,
  extension?: string
): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(path.join(directoryPath))) {
    if (entry.isDirectory) {
      for await (const filePath of enumerateFiles(
        path.join(directoryPath, entry.name),
        extension
      )) {
        yield filePath;
      }
    } else if (entry.isFile) {
      if (extension === undefined || entry.name.endsWith(extension)) {
        yield path.join(directoryPath, entry.name);
      }
    }
  }
}

export async function fileExists(filename: string): Promise<boolean> {
  try {
    await Deno.stat(filename);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw error;
    }
  }
}

export async function searchForNearestFile(
  filePath: string,
  searchFileName: string
): Promise<string | null> {
  const directoryPath = path.dirname(filePath);
  const directoryParts = directoryPath.split(path.SEP);

  while (directoryParts.length > 0) {
    const searchPath = path.join(...directoryParts, searchFileName);

    if (await fileExists(searchPath)) {
      return searchPath;
    }

    directoryParts.pop();
  }

  return null;
}
