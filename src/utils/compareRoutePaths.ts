function segmentCount(path: string): number {
  return path.split("/").filter(Boolean).length;
}

function dynamicSegmentCount(path: string): number {
  return path.split("/").filter((segment) =>
    segment.startsWith("[") && segment.endsWith("]")
  ).length;
}

/** Sort more specific routes before broad dynamic routes. */
export function compareRoutePaths(a: string, b: string): number {
  const dynamicDiff = dynamicSegmentCount(a) - dynamicSegmentCount(b);
  if (dynamicDiff !== 0) return dynamicDiff;

  const segmentDiff = segmentCount(b) - segmentCount(a);
  if (segmentDiff !== 0) return segmentDiff;

  const lengthDiff = b.length - a.length;
  if (lengthDiff !== 0) return lengthDiff;

  return a.localeCompare(b);
}
