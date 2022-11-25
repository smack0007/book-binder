import { path } from "./deps.ts";

export async function copyFile(
  inputFilePath: string,
  outputFilePath: string
): Promise<void> {
  const inputFileStat = await Deno.stat(inputFilePath);

  let outputFileStat: Deno.FileInfo | null = null;
  try {
    outputFileStat = await Deno.stat(outputFilePath);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  if (
    outputFileStat === null ||
    inputFileStat.mtime === null ||
    outputFileStat.mtime === null ||
    outputFileStat.mtime > inputFileStat.mtime
  ) {
    await Deno.copyFile(inputFilePath, outputFilePath);
  }
}

export async function ensureDirectory(path: string): Promise<void> {
  try {
    await Deno.mkdir(path, { recursive: true });
  } catch {
    // Ignore
  }
}

export async function* enumerateFiles(
  directoryPath: string,
  filter?: (filePath: string) => boolean
): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(path.join(directoryPath))) {
    if (entry.isDirectory) {
      for await (const filePath of enumerateFiles(
        path.join(directoryPath, entry.name),
        filter
      )) {
        yield filePath;
      }
    } else if (entry.isFile) {
      const filePath = path.join(directoryPath, entry.name);
      if (filter === undefined || filter(filePath)) {
        yield filePath;
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

export async function readTextFile(filePath: string): Promise<string> {
  return await Deno.readTextFile(filePath);
}

export function readTextFileSync(filePath: string): string {
  return Deno.readTextFileSync(filePath);
}

/**
 * Searches for a given file (searchFileName) relative to another file's
 * path (filePath). Similar to how node_modules resolution works.
 * @param filePath
 * @param searchFileName
 * @returns
 */
export async function resolveFile(
  filePath: string,
  searchFileName: string
): Promise<string | null> {
  const directoryPath = path.dirname(filePath);
  const directoryParts = directoryPath.split(path.SEP);

  if (directoryParts[0] === "") {
    directoryParts.shift();
  }

  while (directoryParts.length > 0) {
    const searchPath = path.join(...directoryParts, searchFileName);

    if (await fileExists(searchPath)) {
      return searchPath;
    }

    directoryParts.pop();
  }

  return null;
}

export async function writeTextFile(
  filePath: string,
  data: string
): Promise<void> {
  await Deno.writeTextFile(filePath, data);
}
