export interface Point {
  x: number;
  y: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  id: number;
}

/**
 * Simple K-Means implementation to find dominant colors
 */
export function kMeans(pixels: Uint8ClampedArray, k: number, iterations: number = 10): Color[] {
  // Initialize centroids from existing pixels, then sort them by brightness
  // to make the initial state more deterministic.
  let centroids: Color[] = [];
  const step = Math.floor(pixels.length / (4 * k));
  for (let i = 0; i < k; i++) {
    const idx = i * step * 4;
    centroids.push({
      r: pixels[idx],
      g: pixels[idx + 1],
      b: pixels[idx + 2],
      id: i,
    });
  }
  
  // Sort initial centroids by brightness
  centroids.sort((a, b) => {
    const lumA = 0.299 * a.r + 0.587 * a.g + 0.114 * a.b;
    const lumB = 0.299 * b.r + 0.587 * b.g + 0.114 * b.b;
    return lumA - lumB;
  });

  for (let iter = 0; iter < iterations; iter++) {
    const clusters: { r: number; g: number; b: number; count: number }[] = Array.from({ length: k }, () => ({
      r: 0,
      g: 0,
      b: 0,
      count: 0,
    }));

    // Assign pixels to nearest centroid
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      let minDist = Infinity;
      let clusterIdx = 0;

      for (let j = 0; j < k; j++) {
        const dist = Math.sqrt(
          Math.pow(r - centroids[j].r, 2) +
          Math.pow(g - centroids[j].g, 2) +
          Math.pow(b - centroids[j].b, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          clusterIdx = j;
        }
      }

      clusters[clusterIdx].r += r;
      clusters[clusterIdx].g += g;
      clusters[clusterIdx].b += b;
      clusters[clusterIdx].count++;
    }

    // Update centroids
    for (let j = 0; j < k; j++) {
      if (clusters[j].count > 0) {
        centroids[j] = {
          r: Math.round(clusters[j].r / clusters[j].count),
          g: Math.round(clusters[j].g / clusters[j].count),
          b: Math.round(clusters[j].b / clusters[j].count),
          id: j,
        };
      }
    }
  }

  return centroids;
}

/**
 * Moore-Neighbor contour tracing algorithm
 */
export function traceContours(mask: boolean[][], width: number, height: number): Point[][] {
  const visited = Array.from({ length: height }, () => new Array(width).fill(false));
  const contours: Point[][] = [];

  // Directions: N, NE, E, SE, S, SW, W, NW
  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] && !visited[y][x]) {
        // Check if it's an edge pixel (has at least one neighbor that is false)
        let isEdge = false;
        for (let i = 0; i < 8; i++) {
          const nx = x + dx[i];
          const ny = y + dy[i];
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || !mask[ny][nx]) {
            isEdge = true;
            break;
          }
        }

        if (isEdge) {
          const contour = traceSingleContour(mask, x, y, width, height, visited);
          if (contour.length > 2) {
            contours.push(contour);
          }
        }
      }
    }
  }

  return contours;
}

function traceSingleContour(
  mask: boolean[][],
  startX: number,
  startY: number,
  width: number,
  height: number,
  visited: boolean[][]
): Point[] {
  const contour: Point[] = [];
  let currX = startX;
  let currY = startY;
  
  // Directions: N, NE, E, SE, S, SW, W, NW (0 to 7)
  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

  // Initial direction: start looking from West (direction 6)
  let enterDir = 6; 
  
  let first = true;
  while (first || (currX !== startX || currY !== startY)) {
    first = false;
    contour.push({ x: currX, y: currY });
    visited[currY][currX] = true;

    let found = false;
    // Search clockwise starting from (enterDir + 1) % 8
    for (let i = 0; i < 8; i++) {
      const dir = (enterDir + 1 + i) % 8;
      const nx = currX + dx[dir];
      const ny = currY + dy[dir];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny][nx]) {
        currX = nx;
        currY = ny;
        // The direction we entered this new pixel from is the opposite of the direction we moved
        enterDir = (dir + 4) % 8;
        found = true;
        break;
      }
    }

    if (!found) break; // Should not happen for a valid mask
    if (contour.length > 10000) break; // Safety break
  }

  return contour;
}

export function getContourArea(contour: Point[]): number {
  let area = 0;
  for (let i = 0; i < contour.length; i++) {
    const j = (i + 1) % contour.length;
    area += contour[i].x * contour[j].y;
    area -= contour[j].x * contour[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Simple check if a point is inside a polygon
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Filter contours to remove islands and noise.
 * For solid shapes (Layer 0), we remove internal holes.
 * For holes in a frame (Layers 1-4), we remove islands inside those holes.
 */
export function filterContours(contours: Point[][], removeInternal: boolean): Point[][] {
  // 1. Filter by area (remove noise)
  const filtered = contours.filter(c => getContourArea(c) > 15);
  
  if (!removeInternal) return filtered;

  // 2. Identify hierarchy
  // A contour is "internal" if it is inside another contour.
  // We only keep "top-level" contours for the mask.
  const results: Point[][] = [];
  for (let i = 0; i < filtered.length; i++) {
    let isInternal = false;
    for (let j = 0; j < filtered.length; j++) {
      if (i === j) continue;
      // Check if first point of i is inside j
      // (Simplified: assumes no partial overlaps which is true for Moore-Neighbor)
      if (isPointInPolygon(filtered[i][0], filtered[j])) {
        // If i is inside j, and j is larger, i is internal
        if (getContourArea(filtered[j]) > getContourArea(filtered[i])) {
          isInternal = true;
          break;
        }
      }
    }
    if (!isInternal) {
      results.push(filtered[i]);
    }
  }
  return results;
}

/**
 * Ramer-Douglas-Peucker algorithm for path simplification
 */
export function simplifyPath(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = getSqDistPointSegment(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) {
      index = i;
      maxDist = dist;
    }
  }

  if (maxDist > tolerance * tolerance) {
    const res1 = simplifyPath(points.slice(0, index + 1), tolerance);
    const res2 = simplifyPath(points.slice(index), tolerance);
    return [...res1.slice(0, res1.length - 1), ...res2];
  } else {
    return [points[0], points[points.length - 1]];
  }
}

function getSqDistPointSegment(p: Point, p1: Point, p2: Point): number {
  let x = p1.x, y = p1.y;
  let dx = p2.x - x, dy = p2.y - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2.x;
      y = p2.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;
  return dx * dx + dy * dy;
}

export function generateSVGPath(contours: Point[][]): string {
  return contours
    .map((contour) => {
      // Simplify before generating path
      const simplified = simplifyPath(contour, 1.2);
      const d = simplified.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
      return d + " Z";
    })
    .join(" ");
}
