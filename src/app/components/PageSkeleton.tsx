/**
 * Reusable Skeleton Loading Components
 * Digunakan di semua halaman untuk loading state yang konsisten.
 */

/** Blok skeleton dasar */
function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

/** Skeleton untuk baris tabel */
function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex gap-4 px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonBlock key={i} className={`h-4 ${i === 0 ? 'w-1/3' : 'flex-1'}`} />
      ))}
    </div>
  );
}

/** Skeleton untuk tabel lengkap (header + rows) */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-10 bg-gray-100 border-b border-gray-200" />
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} cols={cols} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton untuk stat card */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-6 w-28" />
          <SkeletonBlock className="h-3 w-16" />
        </div>
        <SkeletonBlock className="w-12 h-12 rounded-xl" />
      </div>
    </div>
  );
}

/** Skeleton untuk chart area */
export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 animate-pulse">
      <SkeletonBlock className="h-4 w-40 mb-4" />
      <div className="h-[220px] bg-gray-100 rounded-lg" />
    </div>
  );
}

/** Skeleton untuk form card */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-50">
        <SkeletonBlock className="w-10 h-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-3 w-48" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton untuk header halaman + tombol */
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between animate-pulse">
      <div className="space-y-2">
        <SkeletonBlock className="h-5 w-40" />
        <SkeletonBlock className="h-3 w-56" />
      </div>
      <SkeletonBlock className="h-9 w-32 rounded-lg" />
    </div>
  );
}

/** Skeleton untuk filter bar */
export function FilterBarSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 animate-pulse">
      <div className="flex flex-col md:flex-row gap-3">
        <SkeletonBlock className="flex-1 h-9 rounded-lg" />
        <SkeletonBlock className="w-full md:w-48 h-9 rounded-lg" />
      </div>
    </div>
  );
}

/** 
 * Skeleton halaman lengkap: Header + Filter + Table 
 * Ini cocok untuk halaman-halaman list/tabel.
 */
export function PageSkeleton({
  withHeader = true,
  withFilter = true,
  withStats = false,
  statsCount = 3,
  tableRows = 5,
  tableCols = 5,
}: {
  withHeader?: boolean;
  withFilter?: boolean;
  withStats?: boolean;
  statsCount?: number;
  tableRows?: number;
  tableCols?: number;
}) {
  return (
    <div className="space-y-6">
      {withHeader && <PageHeaderSkeleton />}
      {withFilter && <FilterBarSkeleton />}
      {withStats && (
        <div className={`grid grid-cols-1 md:grid-cols-${statsCount} gap-3`}>
          {Array.from({ length: statsCount }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}
      <TableSkeleton rows={tableRows} cols={tableCols} />
    </div>
  );
}

export default PageSkeleton;
