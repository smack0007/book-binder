import { file } from "https://deno.land/x/denosass@1.0.5/src/wasm/grass.deno.js";
import { Marked, path, sass } from "./deps.ts";
import {
  ensureDirectory,
  enumerateFiles,
  readTextFile,
  readTextFileSync,
  resolveFile,
  writeTextFile,
} from "./fs.ts";
import { LayoutFunction } from "./types.ts";

async function main(args: string[]): Promise<number> {
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

  ensureDirectory(outputPath);

  try {
    await processMarkdownFiles(inputPath, outputPath);
    await processCssFiles(inputPath, outputPath);
  } catch (error) {
    console.error(error);
    return 2;
  }

  return 0;
}

function shouldProcess(filePath: string): boolean {
  const fileName = path.basename(filePath);

  return !fileName.startsWith("_") && !fileName.startsWith("+");
}

async function processMarkdownFiles(
  inputPath: string,
  outputPath: string
): Promise<void> {
  for await (const inputFilePath of enumerateFiles(
    inputPath,
    (filePath) => filePath.endsWith(".md") && shouldProcess(filePath)
  )) {
    const outputFilePath = path.join(
      outputPath,
      inputFilePath.substring(inputPath.length).replaceAll(".md", ".html")
    );

    console.info(`${inputFilePath} => ${outputFilePath}`);

    let html = Marked.marked(await readTextFile(inputFilePath), {});

    html = await layoutContent(inputFilePath, html);

    await writeTextFile(outputFilePath, html);
  }
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
    return await layout(content);
  }

  return content;
}

async function processCssFiles(
  inputPath: string,
  outputPath: string
): Promise<void> {
  for await (const inputFilePath of enumerateFiles(
    inputPath,
    (filePath) => filePath.endsWith(".scss") && shouldProcess(filePath)
  )) {
    const outputFilePath = path.join(
      outputPath,
      inputFilePath.substring(inputPath.length).replaceAll(".scss", ".css")
    );

    console.info(`${inputFilePath} => ${outputFilePath}`);

    const result = loadCss(inputFilePath);

    await writeTextFile(outputFilePath, result);
  }
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

Deno.exit(await main(Deno.args));
