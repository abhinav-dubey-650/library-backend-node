/** Build a Spring Data Page<T> JSON shape (subset the frontend relies on). */
export function springPage<T>(content: T[], total: number, page: number, size: number) {
  const totalPages = size > 0 ? Math.ceil(total / size) : 0;
  return {
    content,
    pageable: { pageNumber: page, pageSize: size, offset: page * size },
    totalElements: total,
    totalPages,
    number: page,
    size,
    numberOfElements: content.length,
    first: page === 0,
    last: page >= totalPages - 1,
    empty: content.length === 0,
  };
}
