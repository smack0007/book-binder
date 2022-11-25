import { Marked, path, sass } from "./deps.ts";
import {
  copyFile,
  ensureDirectory,
  enumerateFiles,
  readTextFile,
  readTextFileSync,
  resolveFile,
  writeTextFile,
} from "./fs.ts";
import { LayoutFunction } from "./types.ts";

function shouldProcess(filePath: string): boolean {
  const fileName = path.basename(filePath);

  return !fileName.startsWith("_") && !fileName.startsWith("+");
}

export async function main(args: string[]): Promise<number> {
  const inputPath = args[0];

  if (!inputPath) {
    console.error("Please provide an input directory.");
    return 1;
  }

  const outputPath = args[1];

  if (!outputPath) {
    console.error("Please provide an output directory.");
    return 1;
  }

  console.info("📖 Book Binder 📖");
  console.info(`Input: ${inputPath}`);
  console.info(`Output: ${outputPath}`);

  ensureDirectory(outputPath);

  type FileTypeProcessor = (
    inputPath: string,
    inputFilePath: string,
    outputFilePath: string
  ) => Promise<void>;

  const processors: Array<[string[], FileTypeProcessor]> = [
    [[".css", ".scss"], processCssFile],
    [[".md"], processMarkdownFile],
  ];

  try {
    for await (const inputFilePath of enumerateFiles(
      inputPath,
      shouldProcess
    )) {
      let fileWasProcessed = false;

      for (const [fileExtensions, processor] of processors) {
        let shouldProcess = false;

        for (const fileExtension of fileExtensions) {
          if (inputFilePath.endsWith(fileExtension)) {
            shouldProcess = true;
          }
        }

        if (shouldProcess) {
          await processor(inputPath, inputFilePath, outputPath);
          fileWasProcessed = true;
          break;
        }
      }

      if (!fileWasProcessed) {
        await processStaticFile(inputPath, inputFilePath, outputPath);
      }
    }
  } catch (error) {
    console.error(error);
    return 2;
  }

  return 0;
}

async function processCssFile(
  inputPath: string,
  inputFilePath: string,
  outputPath: string
): Promise<void> {
  const outputFilePath = path.join(
    outputPath,
    inputFilePath.substring(inputPath.length).replaceAll(".scss", ".css")
  );

  console.info(`${inputFilePath} => ${outputFilePath}`);

  const result = loadCss(inputFilePath);

  await writeTextFile(outputFilePath, result);
}

function loadCss(filePath: string): string {
  let result = readTextFileSync(filePath);

  if (filePath.endsWith(".scss")) {
    result = convertSass(result);
  }

  result = result.replaceAll(/\@import \"(.*)\";/g, (_match, p1) => {
    return loadCss(path.join(path.dirname(filePath), p1));
  });

  return result;
}

function convertSass(input: string): string {
  return sass(input, {
    style: "compressed",
  }).to_string() as string;
}

async function processMarkdownFile(
  inputPath: string,
  inputFilePath: string,
  outputPath: string
): Promise<void> {
  const outputFilePath = path.join(
    outputPath,
    inputFilePath.substring(inputPath.length).replaceAll(".md", ".html")
  );

  console.info(`${inputFilePath} => ${outputFilePath}`);

  let html = Marked.marked(await readTextFile(inputFilePath), {});

  html = await layoutContent(inputFilePath, html);

  await writeTextFile(outputFilePath, html);
}

async function layoutContent(
  inputPath: string,
  content: string
): Promise<string> {
  const layoutFile = await resolveFile(inputPath, "+layout.tsx");

  if (layoutFile) {
    const layout: LayoutFunction = (
      await import(path.toFileUrl(layoutFile).toString())
    ).default;
    return await layout({
      content,
    });
  }

  return content;
}

async function processStaticFile(
  inputPath: string,
  inputFilePath: string,
  outputPath: string
): Promise<void> {
  const outputFilePath = path.join(
    outputPath,
    inputFilePath.substring(inputPath.length)
  );

  console.info(`${inputFilePath} => ${outputFilePath}`);

  await copyFile(inputFilePath, outputFilePath);
}
