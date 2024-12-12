import { Request, Response, NextFunction } from "express";
import { PoolOptions } from "mysql2";

export interface LoggerOptions {
  dbConfig: PoolOptions;
  maliciousIpCheckInterval?: number;
}

export interface LoggerInstance {
  initialize(): Promise<void>;
  loggerMiddleware(req: Request, res: Response, next: NextFunction): void;
  ipBlockerMiddleware(req: Request, res: Response, next: NextFunction): void;
}

export default function createLogger(options: LoggerOptions): LoggerInstance;
