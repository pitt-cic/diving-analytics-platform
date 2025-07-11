declare module "papaparse" {
  export interface ParseResult<T> {
    data: T[];
    errors: any[];
    meta: any;
  }

  export interface UnparseConfig {
    quotes?: boolean | boolean[];
    quoteChar?: string;
    escapeChar?: string;
    delimiter?: string;
    header?: boolean;
    newline?: string;
    skipEmptyLines?: boolean | "greedy";
    columns?: string[];
  }

  export function parse<T = any>(
    input: string | File,
    config?: ParseConfig
  ): ParseResult<T>;

  export function unparse(
    data: any[] | { fields: string[]; data: any[] },
    config?: UnparseConfig
  ): string;

  export default {
    parse,
    unparse,
  };
}
