// Coverage matrix — variables (rows) × forecasters (cols).
// Each cell is a small dot whose colour signals coverage status.
// Public/free safe: shows whether coverage exists, never values.

interface CoverageMatrixProps {
  rowLabels: string[];           // variable / country labels
  colLabels: string[];           // forecaster / institution labels
  cells: boolean[][];            // [row][col] = covered?
  cellSize?: number;
  className?: string;
}

export function CoverageMatrix({
  rowLabels,
  colLabels,
  cells,
  cellSize = 14,
  className,
}: CoverageMatrixProps) {
  const gap = 4;
  const colHeader = 60;
  const rowHeader = 130;

  const width = rowHeader + colLabels.length * (cellSize + gap);
  const height = colHeader + rowLabels.length * (cellSize + gap);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ width: "100%", height: "auto", maxWidth: width }}
    >
      {/* Column headers — rotated -45° */}
      {colLabels.map((label, c) => {
        const x = rowHeader + c * (cellSize + gap) + cellSize / 2;
        return (
          <text
            key={`col-${c}`}
            x={x}
            y={colHeader - 8}
            transform={`rotate(-45 ${x} ${colHeader - 8})`}
            fontSize={10}
            fontFamily="var(--font-sans)"
            fontWeight={600}
            fill="var(--muted)"
            textAnchor="start"
          >
            {label}
          </text>
        );
      })}

      {/* Row labels */}
      {rowLabels.map((label, r) => (
        <text
          key={`row-${r}`}
          x={rowHeader - 10}
          y={colHeader + r * (cellSize + gap) + cellSize * 0.75}
          fontSize={11}
          fontFamily="var(--font-sans)"
          fontWeight={500}
          fill="var(--ink)"
          textAnchor="end"
        >
          {label}
        </text>
      ))}

      {/* Cells */}
      {cells.flatMap((row, r) =>
        row.map((covered, c) => {
          const x = rowHeader + c * (cellSize + gap);
          const y = colHeader + r * (cellSize + gap);
          return (
            <rect
              key={`${r}-${c}`}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              rx={3}
              fill={covered ? "var(--cobalt)" : "var(--bg-alt)"}
              opacity={covered ? 0.85 : 1}
              stroke={covered ? "var(--cobalt-dark)" : "var(--border)"}
              strokeWidth={covered ? 0 : 1}
            />
          );
        })
      )}
    </svg>
  );
}
