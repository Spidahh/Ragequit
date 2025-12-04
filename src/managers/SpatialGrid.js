/**
 * SpatialGrid.js
 * Grid-based spatial partitioning for efficient collision detection
 * Divides world into cells for fast neighbor queries
 */

export class SpatialGrid {
  constructor(cellSize = 10, worldBounds = { min: -50, max: 50 }) {
    this.cellSize = cellSize;
    this.worldBounds = worldBounds;
    this.grid = new Map();  // Key: "x,y,z" | Value: Set of objects
    this.objectCells = new Map();  // Key: objectId | Value: Set of cell keys
  }

  /**
   * Get grid cell key for a position
   */
  getCellKey(pos) {
    const cellX = Math.floor(pos.x / this.cellSize);
    const cellY = Math.floor(pos.y / this.cellSize);
    const cellZ = Math.floor(pos.z / this.cellSize);
    return `${cellX},${cellY},${cellZ}`;
  }

  /**
   * Insert object into grid
   */
  insert(obj) {
    const cellKey = this.getCellKey(obj.position);
    
    if (!this.grid.has(cellKey)) {
      this.grid.set(cellKey, new Set());
    }
    this.grid.get(cellKey).add(obj);
    
    if (!this.objectCells.has(obj.id)) {
      this.objectCells.set(obj.id, new Set());
    }
    this.objectCells.get(obj.id).add(cellKey);
  }

  /**
   * Update object position (move between cells if needed)
   */
  update(obj) {
    const newCellKey = this.getCellKey(obj.position);
    const oldCells = this.objectCells.get(obj.id);

    if (!oldCells) {
      this.insert(obj);
      return;
    }

    // If changed cells
    if (!oldCells.has(newCellKey)) {
      // Remove from old cells
      oldCells.forEach(cellKey => {
        const cell = this.grid.get(cellKey);
        if (cell) cell.delete(obj);
      });

      // Add to new cell
      this.insert(obj);
    }
  }

  /**
   * Remove object from grid
   */
  remove(obj) {
    const cells = this.objectCells.get(obj.id);
    if (cells) {
      cells.forEach(cellKey => {
        const cell = this.grid.get(cellKey);
        if (cell) cell.delete(obj);
      });
      this.objectCells.delete(obj.id);
    }
  }

  /**
   * Get nearby objects (in adjacent cells)
   */
  getNearby(pos, searchRadius = 1) {
    const cellX = Math.floor(pos.x / this.cellSize);
    const cellY = Math.floor(pos.y / this.cellSize);
    const cellZ = Math.floor(pos.z / this.cellSize);

    const nearby = new Set();

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dz = -searchRadius; dz <= searchRadius; dz++) {
          const cellKey = `${cellX + dx},${cellY + dy},${cellZ + dz}`;
          const cell = this.grid.get(cellKey);
          if (cell) {
            cell.forEach(obj => nearby.add(obj));
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Clear entire grid
   */
  clear() {
    this.grid.clear();
    this.objectCells.clear();
  }
}
