// Structured logger component (Mimicking Zap/Pino for Phase 1)
export const logger = {
  info: (msg: string, meta?: any) => 
    console.log(JSON.stringify({ level: "info", msg, time: new Date().toISOString(), ...meta })),
  error: (msg: string, meta?: any) => 
    console.error(JSON.stringify({ level: "error", msg, time: new Date().toISOString(), ...meta })),
  warn: (msg: string, meta?: any) => 
    console.warn(JSON.stringify({ level: "warn", msg, time: new Date().toISOString(), ...meta })),
  debug: (msg: string, meta?: any) => 
    console.debug(JSON.stringify({ level: "debug", msg, time: new Date().toISOString(), ...meta })),
};
