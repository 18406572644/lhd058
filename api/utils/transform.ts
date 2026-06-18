export function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  if (typeof obj !== 'object') return obj

  const result: any = {}
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = snakeToCamel(obj[key])
  }
  return result
}
