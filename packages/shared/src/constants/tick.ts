// Simulation tick rate. The server runs at exactly this rate; the client sends
// inputs once per tick and interpolates rendering between snapshots.
// Authority: 01_DESIGN/10_tech_netcode.md § Tick rate.

export const TICK_RATE_HZ = 60 as const
export const TICK_MS = 1000 / TICK_RATE_HZ // 16.666...

// Rolling history retained on the server for lag compensation.
// Authority: 01_DESIGN/10_tech_netcode.md § Lag compensation.
export const LAG_COMP_HISTORY_MS = 400 as const
export const LAG_COMP_HISTORY_TICKS = Math.ceil(LAG_COMP_HISTORY_MS / TICK_MS) // 24

// Max player latency that receives lag compensation — beyond this, hits use
// present-tick positions. Anti-abuse safeguard.
export const LAG_COMP_MAX_MS = 200 as const

// Rendering delay on the client for remote entities — interpolated between
// snapshots this far in the past. Smooths motion under packet jitter.
export const INTERPOLATION_DELAY_MS = 100 as const

// Protocol — bumped any time state schema or message shape changes.
export const PROTOCOL_VERSION = 1 as const
