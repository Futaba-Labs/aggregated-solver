import { createLogger, format, transports } from 'winston';

export interface LogParams {
  labelText: string;
  level: string;
  message: string;
}

const { combine, timestamp, printf, label, prettyPrint, colorize } = format;

const baseFormats = [timestamp(), prettyPrint(), colorize()];

const dynamicLabelFormat = (labelText: string) =>
  combine(
    label({ label: labelText }),
    printf(({ level, message, label, timestamp }) => {
      return `${timestamp} [${label}] ${level}: ${message}`;
    })
  );

const logger = createLogger({
  level: 'debug',
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});

export const logWithLabel = (params: LogParams) => {
  const console = new transports.Console({
    format: combine(...baseFormats, dynamicLabelFormat(params.labelText)),
  });
  logger.add(console);
  logger.log({ level: params.level, message: params.message });
  logger.remove(console);
};
