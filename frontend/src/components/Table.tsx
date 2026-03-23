import type { CSSProperties, ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  align?: 'left' | 'center' | 'right'
  width?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T, index: number) => string
  emptyMessage?: string
  style?: CSSProperties
}

const cellBase: CSSProperties = {
  padding: '10px 16px',
  fontSize: 'var(--text-sm)',
  borderBottom: '1px solid var(--color-border)',
  whiteSpace: 'nowrap',
}

export function Table<T>({ columns, data, rowKey, emptyMessage = 'No data', style }: TableProps<T>) {
  return (
    <div style={{ overflowX: 'auto', ...style }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  ...cellBase,
                  textAlign: col.align || 'left',
                  fontWeight: 600,
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: col.width,
                  background: 'var(--color-bg-surface)',
                  position: 'sticky',
                  top: 0,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  ...cellBase,
                  textAlign: 'center',
                  color: 'var(--color-text-dim)',
                  padding: 'var(--space-10) var(--space-4)',
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                style={{ transition: 'background var(--transition-fast)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      ...cellBase,
                      textAlign: col.align || 'left',
                      color: 'var(--color-text)',
                    }}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
