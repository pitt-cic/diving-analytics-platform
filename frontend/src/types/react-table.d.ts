declare module "react-table" {
  import { ComponentType, ReactNode } from "react";

  export interface Column<D = any> {
    Header?: string | ReactNode | ((props: any) => ReactNode);
    accessor?: string | ((row: D) => any);
    Cell?: ComponentType<any>;
    id?: string;
  }

  export interface Row<D = any> {
    index: number;
    cells: Cell<D>[];
    getRowProps: () => any;
  }

  export interface Cell<D = any> {
    getCellProps: () => any;
    render: (type: string) => ReactNode;
  }

  export interface UseTableOptions<D = any> {
    columns: Column<D>[];
    data: D[];
  }

  export function useTable<D = any>(
    options: UseTableOptions<D>
  ): {
    getTableProps: () => any;
    getTableBodyProps: () => any;
    headerGroups: any[];
    rows: Row<D>[];
    prepareRow: (row: Row<D>) => void;
  };
}
