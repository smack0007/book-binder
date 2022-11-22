import { fs, Marked, path } from "./deps.ts";
import { enumerateFiles, searchForNearestFile } from "./fs.ts";
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

  fs.ensureDir(outputPath);

  try {
    await processMarkdownFiles(inputPath, outputPath);
  } catch (error) {
    console.error(error);
    return 2;
  }

  return 0;
}

async function processMarkdownFiles(
  inputPath: string,
  outputPath: string
): Promise<void> {
  for await (const inputFilePath of enumerateFiles(inputPath, ".md")) {
    const outputFilePath = path.join(
      outputPath,
      inputFilePath.substring(inputPath.length).replaceAll(".md", ".html")
    );

    console.info(`${inputFilePath} => ${outputFilePath}`);

    let html = Marked.marked(await Deno.readTextFile(inputFilePath), {});

    html = await layoutContent(inputFilePath, html);

    await Deno.writeTextFile(outputFilePath, html);
  }
}

async function layoutContent(
  inputPath: string,
  content: string
): Promise<string> {
  const layoutFile = await searchForNearestFile(inputPath, "+layout.tsx");

  if (layoutFile) {
    const layout: LayoutFunction = (
      await import(path.toFileUrl(layoutFile).toString())
    ).default;
    return await layout(content);
  }

  return content;
}

Deno.exit(await main(Deno.args));
