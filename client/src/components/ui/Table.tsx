import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Checkbox } from './Checkbox';

// ============================================================
// Table Base Components
// ============================================================

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ children, striped = false, hoverable = false, bordered = false, compact = false, className = '', ...props }, ref) => {
    return (
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={`
            w-full text-left
            ${className}
          `}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

// Table Head
export interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableHead = React.forwardRef<HTMLTableSectionElement, TableHeadProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={`
          bg-gray-50 border-b border-gray-200
          ${className}
        `}
        {...props}
      >
        {children}
      </thead>
    );
  }
);

TableHead.displayName = 'TableHead';

// Table Body
export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={`
          divide-y divide-gray-200
          ${className}
        `}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);

TableBody.displayName = 'TableBody';

// Table Row
export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  selected?: boolean;
  hoverable?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ children, selected = false, hoverable = true, className = '', ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={`
          ${selected ? 'bg-brand-highlight-green bg-opacity-10' : ''}
          ${hoverable ? 'hover:bg-gray-50 transition-colors duration-150' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </tr>
    );
  }
);

TableRow.displayName = 'TableRow';

// Table Header Cell
export interface TableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

export const TableHeader = React.forwardRef<HTMLTableCellElement, TableHeaderProps>(
  ({ children, sortable = false, sortDirection = null, onSort, className = '', ...props }, ref) => {
    return (
      <th
        ref={ref}
        scope="col"
        className={`
          px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap
          ${sortable ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : ''}
          ${className}
        `}
        onClick={sortable ? onSort : undefined}
        {...props}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          {children}
          {sortable && (
            <span className="text-gray-400">
              {sortDirection === 'asc' && <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />}
              {sortDirection === 'desc' && <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />}
              {sortDirection === null && <ChevronsUpDown className="h-3 w-3 sm:h-4 sm:w-4" />}
            </span>
          )}
        </div>
      </th>
    );
  }
);

TableHeader.displayName = 'TableHeader';

// Table Cell
export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  compact?: boolean;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ children, compact = false, className = '', ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={`
          ${compact ? 'px-2 sm:px-3 py-1.5 sm:py-2' : 'px-2 sm:px-4 py-2 sm:py-3'}
          text-xs sm:text-sm text-gray-900
          ${className}
        `}
        {...props}
      >
        {children}
      </td>
    );
  }
);

TableCell.displayName = 'TableCell';

// ============================================================
// Advanced Data Table Component
// ============================================================

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T = any> {
  id: string;
  label: string;
  accessor?: keyof T | ((row: T) => any);
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  sortable?: boolean;
  selectable?: boolean;
  selectedRows?: (string | number)[];
  onSelectionChange?: (selectedRows: (string | number)[]) => void;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  loading?: boolean;
  compact?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  className?: string;
}

export function DataTable<T = any>({
  columns,
  data,
  keyExtractor,
  sortable = true,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  onRowClick,
  emptyMessage = 'No data available',
  loading = false,
  compact = false,
  striped = false,
  hoverable = true,
  className = ''
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(null);

  // Handle sorting
  const handleSort = (columnId: string) => {
    if (!sortable) return;

    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    const column = columns.find((col) => col.id === sortColumn);
    if (!column) return data;

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (typeof column.accessor === 'function') {
        aValue = column.accessor(a);
        bValue = column.accessor(b);
      } else if (column.accessor) {
        aValue = a[column.accessor];
        bValue = b[column.accessor];
      } else {
        return 0;
      }

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection, columns]);

  // Handle row selection
  const handleRowSelect = (key: string | number, checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      onSelectionChange([...selectedRows, key]);
    } else {
      onSelectionChange(selectedRows.filter((k) => k !== key));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      const allKeys = sortedData.map((row, index) => keyExtractor(row, index));
      onSelectionChange(allKeys);
    } else {
      onSelectionChange([]);
    }
  };

  const allSelected = selectedRows.length === sortedData.length && sortedData.length > 0;
  const someSelected = selectedRows.length > 0 && selectedRows.length < sortedData.length;

  return (
    <div className={className}>
      <Table>
        <TableHead>
          <TableRow hoverable={false}>
            {selectable && (
              <TableHeader className="w-12">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  checkboxSize="sm"
                />
              </TableHeader>
            )}
            {columns.map((column) => (
              <TableHeader
                key={column.id}
                sortable={sortable && column.sortable !== false}
                sortDirection={sortColumn === column.id ? sortDirection : null}
                onSort={() => handleSort(column.id)}
                style={{
                  width: column.width,
                  textAlign: column.align || 'left'
                }}
              >
                {column.label}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {loading ? (
            <TableRow hoverable={false}>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8">
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-brand-dark-green border-t-transparent rounded-full" />
                </div>
              </TableCell>
            </TableRow>
          ) : sortedData.length === 0 ? (
            <TableRow hoverable={false}>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8 text-gray-500">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((row, index) => {
              const key = keyExtractor(row, index);
              const isSelected = selectedRows.includes(key);

              return (
                <TableRow
                  key={key}
                  selected={isSelected}
                  hoverable={hoverable}
                  onClick={() => onRowClick?.(row, index)}
                  className={`
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${striped && index % 2 === 1 ? 'bg-gray-50' : ''}
                  `}
                >
                  {selectable && (
                    <TableCell compact={compact}>
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleRowSelect(key, e.target.checked);
                        }}
                        checkboxSize="sm"
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => {
                    let value: any;

                    if (typeof column.accessor === 'function') {
                      value = column.accessor(row);
                    } else if (column.accessor) {
                      value = row[column.accessor];
                    }

                    const renderedValue = column.render
                      ? column.render(value, row, index)
                      : value?.toString() || '';

                    return (
                      <TableCell
                        key={column.id}
                        compact={compact}
                        style={{ textAlign: column.align || 'left' }}
                      >
                        {renderedValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

DataTable.displayName = 'DataTable';
