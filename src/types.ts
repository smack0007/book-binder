export interface LayoutFunctionArgs {
  content: string;
}

export type LayoutFunction = (args: LayoutFunctionArgs) => Promise<string>;
