/** Resolve a dot-path on an object, e.g. getPath(row, "school.name"). */
export function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}
