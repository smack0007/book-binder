declare global {
  namespace JSX {
    type Element = string;
    interface IntrinsicElements {
      [key: string]: unknown;
    }
  }
}

type HTMLAttributes = { [key: string]: unknown };

const NO_CLOSING_TAG = ["link", "meta"];

export function html(
  tagName: string,
  attributes: HTMLAttributes | null,
  ...children: unknown[]
): string {
  let output = `<${tagName}`;

  if (attributes !== null) {
    for (const [key, value] of Object.entries(attributes)) {
      output += ` ${key}="${value}"`;
    }
  }

  output += ">";

  for (const child of children) {
    if (Array.isArray(child)) {
      output += child.join("");
    } else if (child !== undefined && child !== false) {
      output += child;
    }
  }

  if (!NO_CLOSING_TAG.includes(tagName)) {
    output += `</${tagName}>`;
  }

  return output;
}
